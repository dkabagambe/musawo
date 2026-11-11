import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { initiateOrder } from "@/lib/payments/pesapal";
import { initiateOrder as initiateFlutterwave } from "@/lib/payments/flutterwave";
import { getActiveGateway } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { InitiatePaymentSchema } from "@/lib/validators";
import { can } from "@/lib/rbac";
import { isDemoAllowed } from "@/lib/env";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.user.role, "payments.initiate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof InitiatePaymentSchema>;
  try {
    body = InitiatePaymentSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid input", details: err },
      { status: 400 },
    );
  }

  const course = await db.course.findUnique({
    where: { id: body.courseId, status: "PUBLISHED" },
  });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const existing = await db.enrolment.findUnique({
    where: {
      userId_courseId: { userId: session.user.id, courseId: course.id },
    },
  });
  if (existing && existing.status === "ACTIVE") {
    return NextResponse.json({ error: "Already enrolled" }, { status: 409 });
  }

  const totalAmount = course.fullFeeUgx ?? 0;
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const enrolment = existing
    ? await db.enrolment.update({
        where: { id: existing.id },
        data: {
          planType: body.planType,
          totalAmountUgx: totalAmount,
          intakeId: body.intakeId ?? null,
        },
      })
    : await db.enrolment.create({
        data: {
          userId: session.user.id,
          courseId: course.id,
          intakeId: body.intakeId ?? null,
          planType: body.planType,
          totalAmountUgx: totalAmount,
        },
      });

  const instalmentCount =
    body.planType === "INSTALMENT" ? course.instalmentCount : 1;
  // 50/25/25 payment plan (remarks.md): the first instalment is 50% of the fee
  // so the student crosses the 50% access threshold and can start the course.
  // The remaining 50% is split equally across the rest of the instalments
  // (so 3 instalments = 50/25/25, 2 instalments = 50/50). Full plans are 100%.
  const firstAmount =
    instalmentCount <= 1
      ? totalAmount
      : Math.round(totalAmount * 0.5);

  const merchantRef = `MTC-${Date.now()}-${enrolment.id.slice(-6)}`;
  const gateway = await getActiveGateway();

  const payment = await db.payment.create({
    data: {
      enrolmentId: enrolment.id,
      amount: firstAmount,
      method: "MTN_MOMO",
      gateway:
        gateway === "pesapal"
          ? "PESAPAL"
          : gateway === "flutterwave"
            ? "FLUTTERWAVE"
            : "MANUAL",
      gatewayOrderId: merchantRef,
      status: "PENDING",
    },
  });

  if (body.planType === "INSTALMENT") {
    const blocks = await db.block.findMany({
      where: { courseId: course.id },
      orderBy: { order: "asc" },
    });
    // 50/25/25 plan: first instalment = 50%, remaining 50% split equally.
    const restCount = instalmentCount - 1;
    const restPer = restCount > 0 ? Math.ceil((totalAmount - firstAmount) / restCount) : 0;
    let allocated = 0;
    for (let i = 0; i < instalmentCount; i++) {
      let amt: number;
      if (i === 0) {
        amt = firstAmount;
      } else if (i === instalmentCount - 1) {
        amt = totalAmount - allocated; // last instalment absorbs rounding remainder
      } else {
        amt = restPer;
      }
      allocated += amt;
      await db.instalment.create({
        data: {
          enrolmentId: enrolment.id,
          number: i + 1,
          amount: amt,
          unlocksBlockId: blocks[i]?.id ?? null,
        },
      });
    }
  }

  await audit({
    actorId: session.user.id,
    action: "PAYMENT_INITIATED",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { courseId: course.id, amount: firstAmount, gateway },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  // ── DEMO MODE: skip real gateway, return a demo-confirm URL ────
  // Only active in non-production environments. In production, DEMO_MODE is ignored.
  if (isDemoAllowed() && (gateway === "demo" || process.env.DEMO_MODE === "true")) {
    const demoUrl = `${process.env.NEXTAUTH_URL}/api/payments/demo-confirm?paymentId=${payment.id}&enrolmentId=${enrolment.id}&ref=${merchantRef}`;
    return NextResponse.json({ type: "redirect", redirectUrl: demoUrl });
  }

  const callbackUrl = `${process.env.NEXTAUTH_URL}/api/webhooks/pesapal`;
  const redirectUrl = `${process.env.NEXTAUTH_URL}/dashboard/payments?ref=${merchantRef}`;
  const nameParts = user.name.split(" ");

  let redirectPaymentUrl: string;

  if (gateway === "pesapal") {
    const result = await initiateOrder({
      id: merchantRef,
      currency: "UGX",
      amount: firstAmount,
      description: `${course.title} - ${body.planType === "INSTALMENT" ? `Instalment 1 of ${instalmentCount}` : "Full payment"}`,
      callbackUrl,
      notificationId: process.env.PESAPAL_IPN_ID ?? "",
      billingAddress: {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(" ") || nameParts[0],
        emailAddress: user.email ?? undefined,
        phoneNumber: user.phone ?? undefined,
      },
    });
    redirectPaymentUrl = result.redirectUrl;
    await db.payment.update({
      where: { id: payment.id },
      data: { gatewayRef: result.orderTrackingId },
    });
  } else {
    const result = await initiateFlutterwave({
      id: merchantRef,
      amount: firstAmount,
      currency: "UGX",
      description: course.title,
      callbackUrl,
      redirectUrl,
      customer: {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(" ") || nameParts[0],
        email: user.email ?? undefined,
        phone: user.phone ?? undefined,
      },
    });
    redirectPaymentUrl = result.redirectUrl;
  }

  return NextResponse.json({
    type: "redirect",
    redirectUrl: redirectPaymentUrl,
  });
}
