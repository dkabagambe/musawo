import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { getSetting } from "@/lib/settings";
import { processConfirmedPayment } from "@/lib/payments";

const ReviewSchema = z.object({
  action: z.enum(["verify", "reject"]),
  reason: z.string().max(1000).optional(),
  statementLineId: z.string().cuid().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { claimId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    requirePermission(session.user.role, "claims.review");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }

  let body: z.infer<typeof ReviewSchema>;
  try {
    body = ReviewSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid input", details: err }, { status: 400 });
  }

  const claim = await db.manualPaymentClaim.findUnique({
    where: { id: params.claimId },
    include: { enrolment: { include: { user: true, course: true } } },
  });

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (body.action === "verify") {
    const threshold = parseInt(
      await getSetting("payment.dualControlThreshold", "500000"),
      10
    );

    if (claim.amount > threshold) {
      // Requires a second verifier - mark as UNDER_REVIEW
      await db.manualPaymentClaim.update({
        where: { id: claim.id },
        data: {
          status: "UNDER_REVIEW",
          reviewedById: session.user.id,
          reviewedAt: new Date(),
          statementLineId: body.statementLineId ?? null,
        },
      });
      return NextResponse.json({ ok: true, requiresSecondVerify: true });
    }

    // Below threshold - verify directly
    await db.manualPaymentClaim.update({
      where: { id: claim.id },
      data: {
        status: "VERIFIED",
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        statementLineId: body.statementLineId ?? null,
      },
    });

    // Create Payment and process
    const payment = await db.payment.create({
      data: {
        enrolmentId: claim.enrolmentId,
        amount: claim.amount,
        method: "MANUAL",
        gateway: "MANUAL",
        status: "COMPLETED",
        paidAt: new Date(),
        bankTransferRef: claim.transactionId,
        claimId: claim.id,
      },
    });
    await processConfirmedPayment(payment.id);

    // Notify student in-app
    await db.notification.create({
      data: {
        userId: claim.enrolment.userId,
        channel: "IN_APP",
        type: "PAYMENT_CLAIM_VERIFIED",
        subject: "Payment claim verified",
        body: `Your payment claim of UGX ${claim.amount.toLocaleString()} has been verified.`,
        metadata: { claimId: claim.id },
      },
    });

    await audit({
      actorId: session.user.id,
      action: "PAYMENT_CLAIM_VERIFIED",
      entityType: "ManualPaymentClaim",
      entityId: claim.id,
      metadata: { amount: claim.amount },
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    });

    return NextResponse.json({ ok: true, requiresSecondVerify: false });
  }

  // action === "reject"
  if (!body.reason) {
    return NextResponse.json({ error: "reason is required when rejecting" }, { status: 400 });
  }

  await db.manualPaymentClaim.update({
    where: { id: claim.id },
    data: {
      status: "REJECTED",
      rejectionReason: body.reason,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
    },
  });

  // Notify student by email
  const studentUser = claim.enrolment.user;
  if (studentUser.email) {
    await sendEmail({
      to: studentUser.email,
      subject: `Payment claim rejected - ${claim.enrolment.course.title}`,
      template: "payment-receipt",
      variables: {
        name: studentUser.name,
        courseName: claim.enrolment.course.title,
        amount: `UGX ${claim.amount.toLocaleString()}`,
        date: new Date().toLocaleDateString("en-UG"),
        paymentRef: claim.transactionId,
        portalUrl: `${process.env.NEXTAUTH_URL}/dashboard`,
      },
    });
  }

  // Notify student in-app
  await db.notification.create({
    data: {
      userId: claim.enrolment.userId,
      channel: "IN_APP",
      type: "PAYMENT_CLAIM_REJECTED",
      subject: "Payment claim rejected",
      body: `Your payment claim has been rejected. Reason: ${body.reason}`,
      metadata: { claimId: claim.id },
    },
  });

  await audit({
    actorId: session.user.id,
    action: "PAYMENT_CLAIM_REJECTED",
    entityType: "ManualPaymentClaim",
    entityId: claim.id,
    metadata: { reason: body.reason },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
