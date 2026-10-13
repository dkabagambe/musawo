import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { initiateOrder } from "@/lib/payments/pesapal";
import { initiateOrder as initiateFlutterwave } from "@/lib/payments/flutterwave";
import { applyDiscountCode } from "@/lib/payments";
import { getActiveGateway } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { InitiatePaymentSchema } from "@/lib/validators";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof InitiatePaymentSchema>;
  try {
    body = InitiatePaymentSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid input", details: err }, { status: 400 });
  }

  const course = await db.course.findUnique({
    where: { id: body.courseId, status: "PUBLISHED" },
  });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const existing = await db.enrolment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
  });
  if (existing && existing.status === "ACTIVE") {
    return NextResponse.json({ error: "Already enrolled" }, { status: 409 });
  }

  let discountId: string | undefined;
  let discountAmount = 0;

  if (body.discountCode) {
    const discount = await applyDiscountCode(body.discountCode, course.id);
    if (!discount.valid) {
      return NextResponse.json({ error: discount.error }, { status: 400 });
    }
    discountId = discount.discountId;
    if (discount.discountType === "PERCENTAGE") {
      discountAmount = Math.round((course.fullFeeUgx * (discount.discountValue ?? 0)) / 100);
    } else if (discount.discountType === "FIXED_AMOUNT") {
      discountAmount = discount.discountValue ?? 0;
    } else if (discount.discountType === "SCHOLARSHIP") {
      discountAmount = course.fullFeeUgx;
    }
    if (discountId) {
      await db.discountCode.update({
        where: { id: discountId },
        data: { uses: { increment: 1 } },
      });
    }
  }

  const totalAmount = Math.max(0, course.fullFeeUgx - discountAmount);
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const enrolment = existing
    ? await db.enrolment.update({
        where: { id: existing.id },
        data: {
          planType: body.planType,
          totalAmountUgx: totalAmount,
          discountCodeId: discountId ?? null,
          discountAmountUgx: discountAmount,
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
          discountCodeId: discountId ?? null,
          discountAmountUgx: discountAmount,
        },
      });

  if (totalAmount === 0) {
    await db.enrolment.update({
      where: { id: enrolment.id },
      data: { status: "ACTIVE", paidAmountUgx: 0, unlockedBlockOrder: 9999 },
    });
    return NextResponse.json({ type: "scholarship", enrolmentId: enrolment.id });
  }

  const instalmentCount = body.planType === "INSTALMENT" ? course.instalmentCount : 1;
  const firstAmount =
    body.planType === "INSTALMENT"
      ? Math.ceil(totalAmount / instalmentCount)
      : totalAmount;

  const merchantRef = `MTC-${Date.now()}-${enrolment.id.slice(-6)}`;
  const gateway = await getActiveGateway();

  const payment = await db.payment.create({
    data: {
      enrolmentId: enrolment.id,
      amount: firstAmount,
      method: "MTN_MOMO",
      gateway: gateway === "pesapal" ? "PESAPAL" : gateway === "flutterwave" ? "FLUTTERWAVE" : "MANUAL",
      gatewayOrderId: merchantRef,
      status: "PENDING",
    },
  });

  if (body.planType === "INSTALMENT") {
    const blocks = await db.block.findMany({
      where: { courseId: course.id },
      orderBy: { order: "asc" },
    });
    for (let i = 0; i < instalmentCount; i++) {
      await db.instalment.create({
        data: {
          enrolmentId: enrolment.id,
          number: i + 1,
          amount:
            i === instalmentCount - 1
              ? totalAmount - firstAmount * (instalmentCount - 1)
              : firstAmount,
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
  if (gateway === "demo" || process.env.DEMO_MODE === "true") {
    const demoUrl = `${process.env.NEXTAUTH_URL}/api/payments/demo-confirm?paymentId=${payment.id}&enrolmentId=${enrolment.id}&ref=${merchantRef}`;
    return NextResponse.json({ type: "redirect", redirectUrl: demoUrl });
  }

  const callbackUrl = `${process.env.NEXTAUTH_URL}/api/webhooks/pesapal`;
  const redirectUrl = `${process.env.NEXTAUTH_URL}/dashboard/payments?ref=${merchantRef}`;
  const nameParts   = user.name.split(" ");

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
        lastName:  nameParts.slice(1).join(" ") || nameParts[0],
        emailAddress: user.email ?? undefined,
        phoneNumber:  user.phone ?? undefined,
      },
    });
    redirectPaymentUrl = result.redirectUrl;
    await db.payment.update({
      where: { id: payment.id },
      data:  { gatewayRef: result.orderTrackingId },
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
        lastName:  nameParts.slice(1).join(" ") || nameParts[0],
        email:  user.email ?? undefined,
        phone:  user.phone ?? undefined,
      },
    });
    redirectPaymentUrl = result.redirectUrl;
  }

  return NextResponse.json({ type: "redirect", redirectUrl: redirectPaymentUrl });
}
