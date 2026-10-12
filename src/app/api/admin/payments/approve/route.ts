import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { processConfirmedPayment } from "@/lib/payments";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

const ApproveSchema = z.object({
  paymentId: z.string().cuid(),
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(500).optional(),
});

/**
 * POST /api/admin/payments/approve
 * Admin approves or rejects a bank transfer payment.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof ApproveSchema>;
  try {
    body = ApproveSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid input", details: err }, { status: 400 });
  }

  const payment = await db.payment.findUnique({
    where: { id: body.paymentId },
    include: {
      enrolment: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          course: { select: { title: true } },
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (payment.status !== "PENDING_APPROVAL") {
    return NextResponse.json({ error: "Payment is not pending approval" }, { status: 409 });
  }

  if (body.action === "approve") {
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        bankApprovedBy: session.user.id,
        bankApprovedAt: new Date(),
        paidAt: new Date(),
      },
    });

    await processConfirmedPayment(payment.id);

    await audit({
      actorId: session.user.id,
      action: "PAYMENT_CONFIRMED",
      entityType: "Payment",
      entityId: payment.id,
      metadata: {
        method: "BANK_TRANSFER",
        approvedBy: session.user.name,
        studentName: payment.enrolment.user.name,
      },
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    });

    // Notify student
    if (payment.enrolment.user.email) {
      await sendEmail({
        to: payment.enrolment.user.email,
        subject: `Your bank payment has been approved — ${payment.enrolment.course.title}`,
        template: "payment-receipt",
        variables: {
          name: payment.enrolment.user.name,
          courseName: payment.enrolment.course.title,
          amount: `UGX ${payment.amount.toLocaleString()}`,
          date: new Date().toLocaleDateString("en-UG"),
          paymentRef: payment.bankTransferRef ?? payment.id,
          portalUrl: `${process.env.NEXTAUTH_URL}/dashboard`,
        },
      });
    }

    return NextResponse.json({ ok: true, action: "approved" });
  } else {
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        bankRejectedAt: new Date(),
        bankRejectedReason: body.reason ?? "Not approved",
        failureReason: body.reason ?? "Bank transfer rejected by admin",
      },
    });

    await audit({
      actorId: session.user.id,
      action: "PAYMENT_INITIATED",
      entityType: "Payment",
      entityId: payment.id,
      metadata: { action: "rejected", reason: body.reason },
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    });

    // Notify student of rejection
    if (payment.enrolment.user.email) {
      await sendEmail({
        to: payment.enrolment.user.email,
        subject: `Payment update — ${payment.enrolment.course.title}`,
        template: "payment-receipt",
        variables: {
          name: payment.enrolment.user.name,
          courseName: payment.enrolment.course.title,
          amount: `UGX ${payment.amount.toLocaleString()}`,
          date: new Date().toLocaleDateString("en-UG"),
          paymentRef: payment.bankTransferRef ?? payment.id,
          portalUrl: `${process.env.NEXTAUTH_URL}/dashboard/payments`,
        },
      });
    }

    return NextResponse.json({ ok: true, action: "rejected" });
  }
}
