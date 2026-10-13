import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPresignedUploadUrl } from "@/lib/s3";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

const BankPaymentSchema = z.object({
  courseId: z.string().cuid(),
  intakeId: z.string().cuid().optional(),
  amount: z.number().int().positive(),
  bankName: z.string().min(2).max(100),
  bankTransferRef: z.string().min(2).max(100),
  discountCode: z.string().max(50).optional(),
  planType: z.enum(["FULL", "INSTALMENT"]).default("FULL"),
});

/**
 * POST /api/payments/bank
 * Student submits a bank transfer — gets a presigned S3 upload URL
 * for their receipt. Creates a PENDING_APPROVAL payment record.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof BankPaymentSchema>;
  try {
    body = BankPaymentSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid input", details: err }, { status: 400 });
  }

  const course = await db.course.findUnique({
    where: { id: body.courseId, status: "PUBLISHED" },
  });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Apply discount code if provided
  let discountAmount = 0;
  let discountCodeId: string | undefined;
  if (body.discountCode) {
    const { applyDiscountCode } = await import("@/lib/payments");
    const discount = await applyDiscountCode(body.discountCode, course.id);
    if (!discount.valid) {
      return NextResponse.json({ error: discount.error }, { status: 400 });
    }
    discountCodeId = discount.discountId;
    if (discount.discountType === "PERCENTAGE") {
      discountAmount = Math.round((course.fullFeeUgx * (discount.discountValue ?? 0)) / 100);
    } else if (discount.discountType === "FIXED_AMOUNT") {
      discountAmount = discount.discountValue ?? 0;
    } else if (discount.discountType === "SCHOLARSHIP") {
      discountAmount = course.fullFeeUgx;
    }
  }

  const totalAmount = Math.max(0, course.fullFeeUgx - discountAmount);

  // Create or reuse enrolment
  const existingEnrolment = await db.enrolment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
  });

  const enrolment = existingEnrolment
    ? await db.enrolment.update({
        where: { id: existingEnrolment.id },
        data: {
          planType: body.planType,
          totalAmountUgx: totalAmount,
          discountCodeId: discountCodeId ?? null,
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
          discountCodeId: discountCodeId ?? null,
          discountAmountUgx: discountAmount,
          status: "PENDING_PAYMENT",
        },
      });

  // Generate S3 key and presigned upload URL for receipt
  const receiptKey = `bank-receipts/${session.user.id}/${enrolment.id}/${Date.now()}.pdf`;
  const uploadUrl = await getPresignedUploadUrl(receiptKey, "application/pdf", 900);

  // Create payment record
  const payment = await db.payment.create({
    data: {
      enrolmentId: enrolment.id,
      amount: body.amount,
      method: "BANK_TRANSFER",
      gateway: "MANUAL",
      status: "PENDING_APPROVAL",
      bankName: body.bankName,
      bankTransferRef: body.bankTransferRef,
      bankReceiptS3Key: receiptKey,
    },
  });

  // Notify staff (REGISTRAR + SUPERADMIN) by email
  const admins = await db.user.findMany({
    where: { role: { in: ["SUPERADMIN", "REGISTRAR", "ADMIN"] }, status: "ACTIVE" },
  });
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  for (const admin of admins) {
    if (admin.email) {
      await sendEmail({
        to: admin.email,
        subject: `Bank payment pending review — ${user?.name}`,
        template: "payment-receipt",
        variables: {
          name: admin.name,
          courseName: course.title,
          amount: `UGX ${body.amount.toLocaleString()}`,
          date: new Date().toLocaleDateString("en-UG"),
          paymentRef: body.bankTransferRef,
          portalUrl: `${process.env.NEXTAUTH_URL}/admin/payments?paymentId=${payment.id}`,
        },
      });
    }
  }

  await audit({
    actorId: session.user.id,
    action: "PAYMENT_INITIATED",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { method: "BANK_TRANSFER", bankRef: body.bankTransferRef },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({
    paymentId: payment.id,
    uploadUrl,
    receiptKey,
    message: "Upload your bank receipt to the provided URL. Your enrolment will be activated once approved.",
  });
}
