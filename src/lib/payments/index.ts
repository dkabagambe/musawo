import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { getSetting } from "@/lib/settings";
import type { Enrolment, User, Course } from "@prisma/client";

// ─── helpers ───────────────────────────────────────────────────────────────

function pctToUnlockedBlockOrder(pct: number): number {
  if (pct >= 100) return 9999;
  if (pct >= 75)  return 3;
  if (pct >= 50)  return 2;
  if (pct >= 25)  return 1;
  return 0;
}

/**
 * Generate a sequential MTC receipt number for the current year.
 * Format: MTC-RCT-YYYY00001
 */
async function generateReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear().toString();
  const prefix = `MTC-RCT-${year}`;
  const count = await db.ledgerEntry.count({
    where: {
      receiptNumber: { startsWith: prefix },
    },
  });
  return `${prefix}${String(count + 1).padStart(5, "0")}`;
}

/**
 * Called after a payment webhook confirms a successful payment.
 * Idempotent — safe to call multiple times for the same payment.
 *
 * State machine transitions:
 *   PENDING_PAYMENT → ACTIVE (full payment)
 *   PENDING_PAYMENT → PARTIALLY_PAID (first instalment)
 *   PARTIALLY_PAID  → PARTIALLY_PAID (mid instalment)
 *   PARTIALLY_PAID  → ACTIVE (final instalment)
 *   OVERDUE         → PARTIALLY_PAID or ACTIVE (catch-up payment)
 */
export async function processConfirmedPayment(paymentId: string): Promise<void> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: {
      enrolment: {
        include: {
          user: true,
          course: true,
          instalments: { orderBy: { number: "asc" } },
        },
      },
    },
  });

  if (!payment) throw new Error(`Payment ${paymentId} not found`);
  if (payment.status === "COMPLETED") return; // idempotent

  const { enrolment } = payment;
  const { user, course, instalments } = enrolment as Enrolment & {
    user: User;
    course: Course;
    instalments: Array<{
      id: string;
      number: number;
      amount: number;
      paidAt: Date | null;
      unlocksBlockId: string | null;
    }>;
  };

  // 1. Mark payment completed
  await db.payment.update({
    where: { id: paymentId },
    data: { status: "COMPLETED", paidAt: new Date() },
  });

  // 2. Compute new paid amount and paidPercent
  const newPaid = enrolment.paidAmountUgx + payment.amount;
  const paidPercent = Math.min(100, Math.floor((newPaid / enrolment.totalAmountUgx) * 100));
  const newUnlockedBlockOrder = pctToUnlockedBlockOrder(paidPercent);

  // 3. Generate receipt number and update ledger
  const receiptNumber = await generateReceiptNumber();
  await db.ledgerEntry.create({
    data: {
      enrolmentId: enrolment.id,
      type: "PAYMENT",
      amount: payment.amount,
      balanceAfter: enrolment.totalAmountUgx - newPaid,
      description: `Payment via ${payment.gateway} — ref ${payment.gatewayRef ?? payment.id}`,
      paymentId: payment.id,
      receiptNumber,
    },
  });

  // 4. Instalment: mark paid, unlock block
  const unpaidInstalment = instalments.find((i) => i.paidAt === null);

  if (unpaidInstalment) {
    await db.instalment.update({
      where: { id: unpaidInstalment.id },
      data: { paidAt: new Date(), paymentId: payment.id },
    });
  }

  // 5. Determine new enrolment status using paidPercent
  const fullyPaid = paidPercent >= 100;
  const remainingInstalments = instalments.filter(
    (i) => i.id !== unpaidInstalment?.id && i.paidAt === null
  );

  let newStatus: string;
  if (fullyPaid) {
    newStatus = "ACTIVE";
    await db.enrolment.update({
      where: { id: enrolment.id },
      data: {
        status: "ACTIVE",
        paidAmountUgx: newPaid,
        paidPercent: 100,
        unlockedBlockOrder: 9999,
        overdueSince: null,
        graceUntil: null,
        provisionalUntil: null,
      },
    });
  } else if (paidPercent >= 25) {
    newStatus = remainingInstalments.length > 0 ? "PARTIALLY_PAID" : "ACTIVE";
    await db.enrolment.update({
      where: { id: enrolment.id },
      data: {
        status: newStatus as never,
        paidAmountUgx: newPaid,
        paidPercent,
        unlockedBlockOrder: newUnlockedBlockOrder,
        overdueSince: null,
        graceUntil: null,
      },
    });
  } else {
    newStatus = enrolment.status;
    await db.enrolment.update({
      where: { id: enrolment.id },
      data: {
        paidAmountUgx: newPaid,
        paidPercent,
        unlockedBlockOrder: newUnlockedBlockOrder,
      },
    });
  }

  await audit({
    actorId: user.id,
    action: "PAYMENT_CONFIRMED",
    entityType: "Payment",
    entityId: payment.id,
    metadata: {
      amount: payment.amount,
      gateway: payment.gateway,
      course: course.title,
      newStatus,
      paidPercent,
      unlockedBlockOrder: newUnlockedBlockOrder,
    },
  });

  // 6. Notifications
  if (user.email) {
    await sendEmail({
      to: user.email,
      subject: `Payment received — ${course.title}`,
      template: "payment-receipt",
      variables: {
        name: user.name,
        courseName: course.title,
        amount: `UGX ${payment.amount.toLocaleString()}`,
        date: new Date().toLocaleDateString("en-UG"),
        paymentRef: payment.gatewayRef ?? payment.id,
        portalUrl: `${process.env.NEXTAUTH_URL}/dashboard/enrolled/${enrolment.id}`,
      },
    });
  }

  if (user.phone) {
    await sendSms({
      to: user.phone,
      message: `MTC: Payment of UGX ${payment.amount.toLocaleString()} received for ${course.title}. Ref: ${payment.gatewayRef ?? payment.id}. Log in to start learning: ${process.env.NEXTAUTH_URL}/dashboard`,
    });
  }
}

/**
 * Reverse a verified/completed payment (fraud reversal).
 * Recomputes paidPercent from remaining COMPLETED non-reversed payments.
 */
export async function reverseVerifiedPayment(
  paymentId: string,
  reversedById: string,
  reason: string
): Promise<void> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { enrolment: true },
  });

  if (!payment) throw new Error(`Payment ${paymentId} not found`);
  if (payment.status !== "COMPLETED") {
    throw new Error(`Payment ${paymentId} is not COMPLETED (status: ${payment.status})`);
  }

  const { enrolment } = payment;
  const oldStatus = enrolment.status;
  const oldPct = enrolment.paidPercent;

  // Mark payment reversed
  await db.payment.update({
    where: { id: paymentId },
    data: {
      reversedAt: new Date(),
      reversedBy: reversedById,
      reversalReason: reason,
      fraudStrike: true,
      status: "REFUNDED",
    },
  });

  // Create negative REFUND ledger entry
  const newBalance = enrolment.paidAmountUgx - payment.amount;
  await db.ledgerEntry.create({
    data: {
      enrolmentId: enrolment.id,
      type: "REFUND",
      amount: -payment.amount,
      balanceAfter: enrolment.totalAmountUgx - newBalance,
      description: `Reversal of payment ${paymentId} — ${reason}`,
      paymentId: payment.id,
      reversedAt: new Date(),
    },
  });

  // Recompute paidPercent from remaining COMPLETED non-reversed payments
  const remaining = await db.payment.findMany({
    where: {
      enrolmentId: enrolment.id,
      status: "COMPLETED",
      reversedAt: null,
    },
  });
  const newPaidAmount = remaining.reduce((sum, p) => sum + p.amount, 0);
  const newPct = enrolment.totalAmountUgx > 0
    ? Math.min(100, Math.floor((newPaidAmount / enrolment.totalAmountUgx) * 100))
    : 0;
  const newUnlockedBlockOrder = pctToUnlockedBlockOrder(newPct);

  // Determine new status
  let newStatus: string;
  if (newPct >= 100) {
    newStatus = "ACTIVE";
  } else if (newPct >= 25) {
    newStatus = "PARTIALLY_PAID";
  } else {
    newStatus = "PENDING_PAYMENT";
  }

  // Check fraud strike threshold
  const fraudThreshold = parseInt(
    await getSetting("payment.fraudStrikeThreshold", "2"),
    10
  );

  // Increment fraudStrikes on user
  const updatedUser = await db.user.update({
    where: { id: enrolment.userId },
    data: { fraudStrikes: { increment: 1 } },
  });

  if (updatedUser.fraudStrikes >= fraudThreshold) {
    newStatus = "SUSPENDED";
  }

  await db.enrolment.update({
    where: { id: enrolment.id },
    data: {
      paidAmountUgx: newPaidAmount,
      paidPercent: newPct,
      unlockedBlockOrder: newUnlockedBlockOrder,
      status: newStatus as never,
    },
  });

  await audit({
    actorId: reversedById,
    action: "PAYMENT_REVERSED",
    entityType: "Payment",
    entityId: paymentId,
    metadata: { reason },
    before: { status: oldStatus, paidPercent: oldPct },
    after: { status: newStatus, paidPercent: newPct },
  });
}

export async function applyDiscountCode(
  code: string,
  courseId: string
): Promise<{
  valid: boolean;
  discountId?: string;
  discountType?: string;
  discountValue?: number;
  error?: string;
}> {
  const discount = await db.discountCode.findUnique({ where: { code } });
  if (!discount) return { valid: false, error: "Invalid code" };
  if (discount.expiresAt && discount.expiresAt < new Date())
    return { valid: false, error: "Code expired" };
  if (discount.maxUses && discount.uses >= discount.maxUses)
    return { valid: false, error: "Code fully used" };
  if (discount.courseId && discount.courseId !== courseId)
    return { valid: false, error: "Code not valid for this course" };

  return {
    valid: true,
    discountId: discount.id,
    discountType: discount.type,
    discountValue: discount.value,
  };
}

/**
 * Mark an enrolment as OVERDUE after a missed instalment due date.
 * Called by a scheduled job / cron. Idempotent.
 */
export async function markEnrolmentOverdue(
  enrolmentId: string,
  gracePeriodDays: number = 7
): Promise<void> {
  const enrolment = await db.enrolment.findUnique({ where: { id: enrolmentId } });
  if (!enrolment || enrolment.status !== "PARTIALLY_PAID") return;

  const now = new Date();
  const graceUntil = new Date(now.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);

  await db.enrolment.update({
    where: { id: enrolmentId },
    data: { status: "OVERDUE", overdueSince: now, graceUntil },
  });

  await audit({
    actorId: undefined,
    action: "ENROLMENT_SUSPENDED",
    entityType: "Enrolment",
    entityId: enrolmentId,
    metadata: { reason: "Missed instalment", gracePeriodDays, graceUntil },
  });
}

/**
 * Grant provisional access for a bank-transfer pending enrolment.
 * Called by admin when provisionalAccessHours setting > 0.
 */
export async function grantProvisionalAccess(
  enrolmentId: string,
  hours: number
): Promise<void> {
  const provisionalUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
  await db.enrolment.update({
    where: { id: enrolmentId },
    data: { provisionalUntil, unlockedBlockOrder: 1 },
  });
}
