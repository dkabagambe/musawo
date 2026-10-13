import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requirePermission, ForbiddenError, assertNotSelfApproval } from "@/lib/rbac";
import { processConfirmedPayment } from "@/lib/payments";

const SecondVerifySchema = z.object({
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

  let body: z.infer<typeof SecondVerifySchema>;
  try {
    body = SecondVerifySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid input", details: err }, { status: 400 });
  }

  const claim = await db.manualPaymentClaim.findUnique({
    where: { id: params.claimId },
  });

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (claim.status !== "UNDER_REVIEW") {
    return NextResponse.json(
      { error: `Claim is not UNDER_REVIEW (status: ${claim.status})` },
      { status: 400 }
    );
  }

  // Dual-control: verifier must be different from reviewer
  try {
    assertNotSelfApproval(claim.reviewedById!, session.user.id);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }

  await db.manualPaymentClaim.update({
    where: { id: claim.id },
    data: {
      status: "VERIFIED",
      verifiedById: session.user.id,
      verifiedAt: new Date(),
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
      userId: (await db.enrolment.findUnique({ where: { id: claim.enrolmentId }, select: { userId: true } }))!.userId,
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
    metadata: { secondVerify: true },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
