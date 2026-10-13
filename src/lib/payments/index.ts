import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import type { Enrolment, User, Course } from "@prisma/client";

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

  // 2. Update ledger
  const newPaid = enrolment.paidAmountUgx + payment.amount;
  await db.ledgerEntry.create({
    data: {
      enrolmentId: enrolment.id,
      type: "PAYMENT",
      amount: payment.amount,
      balanceAfter: enrolment.totalAmountUgx - newPaid,
      description: `Payment via ${payment.gateway} — ref ${payment.gatewayRef ?? payment.id}`,
      paymentId: payment.id,
    },
  });

  await db.enrolment.update({
    where: { id: enrolment.id },
    data: { paidAmountUgx: newPaid },
  });

  // 3. Instalment: mark paid, unlock block
  const unpaidInstalment = instalments.find((i) => i.paidAt === null);
  let newUnlockedBlockOrder = enrolment.unlockedBlockOrder;

  if (unpaidInstalment) {
    await db.instalment.update({
      where: { id: unpaidInstalment.id },
      data: { paidAt: new Date(), paymentId: payment.id },
    });

    if (unpaidInstalment.unlocksBlockId) {
      const block = await db.block.findUnique({ where: { id: unpaidInstalment.unlocksBlockId } });
      if (block) {
        newUnlockedBlockOrder = Math.max(enrolment.unlockedBlockOrder, block.order);
        await db.enrolment.update({
          where: { id: enrolment.id },
          data: { unlockedBlockOrder: newUnlockedBlockOrder },
        });
      }
    }
  }

  // 4. Determine new enrolment status
  const fullyPaid = newPaid >= enrolment.totalAmountUgx;
  const remainingInstalments = instalments.filter((i) => i.id !== unpaidInstalment?.id && i.paidAt === null);

  let newStatus: string;
  if (fullyPaid) {
    newStatus = "ACTIVE";
    await db.enrolment.update({
      where: { id: enrolment.id },
      data: {
        status: "ACTIVE",
        unlockedBlockOrder: 9999,
        overdueSince: null,
        graceUntil: null,
        provisionalUntil: null,
      },
    });
  } else if (enrolment.status === "PENDING_PAYMENT" || enrolment.status === "OVERDUE") {
    // First instalment or catch-up — move to PARTIALLY_PAID
    newStatus = remainingInstalments.length > 0 ? "PARTIALLY_PAID" : "ACTIVE";
    await db.enrolment.update({
      where: { id: enrolment.id },
      data: {
        status: newStatus as never,
        unlockedBlockOrder: newUnlockedBlockOrder,
        overdueSince: null,
        graceUntil: null,
      },
    });
  } else {
    // Already PARTIALLY_PAID, another instalment came in
    newStatus = "PARTIALLY_PAID";
    await db.enrolment.update({
      where: { id: enrolment.id },
      data: { status: "PARTIALLY_PAID", unlockedBlockOrder: newUnlockedBlockOrder },
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
      unlockedBlockOrder: newUnlockedBlockOrder,
    },
  });

  // 5. Notifications
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
