import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getPresignedUploadUrl } from "@/lib/s3";
import { getSetting } from "@/lib/settings";

const ClaimSchema = z.object({
  enrolmentId: z.string().cuid(),
  method: z.enum(["BANK_TRANSFER", "MOBILE_MONEY_MTN", "MOBILE_MONEY_AIRTEL", "CASH"]),
  transactionId: z.string().min(3).max(100),
  amount: z.number().int().positive(),
  payerName: z.string().min(2).max(100),
  payerPhone: z.string().min(9).max(20),
  bankOrProvider: z.string().min(2).max(100),
  claimedAt: z.string().datetime(),
});

/**
 * POST /api/payments/claim - student submits a manual payment claim
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: z.infer<typeof ClaimSchema>;
  try {
    body = ClaimSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid input", details: err }, { status: 400 });
  }

  // Rate limit: count claims submitted by this user today
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const todayCount = await db.manualPaymentClaim.count({
    where: { claimantId: userId, createdAt: { gte: dayStart } },
  });
  const dailyLimit = parseInt(await getSetting("payment.claimsPerStudentPerDay", "3"), 10);
  if (todayCount >= dailyLimit) {
    return NextResponse.json(
      { error: "Daily claim limit reached. Try again tomorrow." },
      { status: 429 }
    );
  }

  // Check transactionId uniqueness
  const existing = await db.manualPaymentClaim.findUnique({
    where: { transactionId: body.transactionId },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A claim with this transaction ID already exists." },
      { status: 409 }
    );
  }

  // Validate claimedAt
  const claimedAt = new Date(body.claimedAt);
  const now = new Date();
  if (claimedAt > now) {
    return NextResponse.json({ error: "claimedAt cannot be in the future" }, { status: 400 });
  }
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  if (claimedAt < ninetyDaysAgo) {
    return NextResponse.json({ error: "claimedAt cannot be more than 90 days ago" }, { status: 400 });
  }

  // Verify enrolment belongs to student and is in a valid status
  const enrolment = await db.enrolment.findUnique({
    where: { id: body.enrolmentId },
  });
  if (!enrolment || enrolment.userId !== userId) {
    return NextResponse.json({ error: "Enrolment not found" }, { status: 404 });
  }
  if (enrolment.status !== "PENDING_PAYMENT" && enrolment.status !== "PARTIALLY_PAID") {
    return NextResponse.json(
      { error: "Claims can only be submitted for enrolments in PENDING_PAYMENT or PARTIALLY_PAID status." },
      { status: 400 }
    );
  }

  // Create the claim
  const claim = await db.manualPaymentClaim.create({
    data: {
      enrolmentId: body.enrolmentId,
      claimantId: userId,
      method: body.method,
      transactionId: body.transactionId,
      amount: body.amount,
      payerName: body.payerName,
      payerPhone: body.payerPhone,
      bankOrProvider: body.bankOrProvider,
      claimedAt,
    },
  });

  // Generate presigned S3 URL for receipt image upload
  const s3Key = `payment-claims/${userId}/${claim.id}/${Date.now()}`;
  const uploadUrl = await getPresignedUploadUrl(s3Key, "image/jpeg", 900);

  // Notify BURSAR users in-app
  const bursars = await db.user.findMany({
    where: { role: { in: ["BURSAR", "SUPERADMIN"] }, status: "ACTIVE" },
    select: { id: true },
  });
  if (bursars.length > 0) {
    await db.notification.createMany({
      data: bursars.map((b) => ({
        userId: b.id,
        channel: "IN_APP" as const,
        type: "PAYMENT_CLAIM_SUBMITTED",
        subject: "New payment claim submitted",
        body: `A student has submitted a manual payment claim of UGX ${body.amount.toLocaleString()} (ref: ${body.transactionId}).`,
        metadata: { claimId: claim.id, enrolmentId: body.enrolmentId },
      })),
    });
  }

  await audit({
    actorId: userId,
    action: "PAYMENT_CLAIM_SUBMITTED",
    entityType: "ManualPaymentClaim",
    entityId: claim.id,
    metadata: { amount: body.amount, method: body.method, transactionId: body.transactionId },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ claimId: claim.id, uploadUrl, s3Key }, { status: 201 });
}

/**
 * GET /api/payments/claim?enrolmentId=xxx - list claims for an enrolment owned by the session user
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const enrolmentId = searchParams.get("enrolmentId");
  if (!enrolmentId) {
    return NextResponse.json({ error: "enrolmentId query param required" }, { status: 400 });
  }

  const enrolment = await db.enrolment.findUnique({ where: { id: enrolmentId } });
  if (!enrolment || enrolment.userId !== session.user.id) {
    return NextResponse.json({ error: "Enrolment not found" }, { status: 404 });
  }

  const claims = await db.manualPaymentClaim.findMany({
    where: { enrolmentId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ claims });
}
