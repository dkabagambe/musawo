import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import type { Enrolment, User, Course } from "@prisma/client";

/**
 * Called after a payment webhook confirms a successful payment.
 * Handles: ledger entry, instalment unlocking, enrolment activation,
 * receipt email, and SMS confirmation.
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

  // Mark payment completed
  await db.payment.update({
    where: { id: paymentId },
    data: { status: "COMPLETED", paidAt: new Date() },
  });

  // Update ledger
  const newPaid = enrolment.paidAmountUgx + payment.amount;
  await db.ledgerEntry.create({
    data: {
      enrolmentId: enrolment.id,
      type: "PAYMENT",
      amount: payment.amount,
      balanceAfter: enrolment.totalAmountUgx - newPaid,
      description: `Payment via ${payment.gateway} — ref ${payment.gatewayRef}`,
      paymentId: payment.id,
    },
  });

  await db.enrolment.update({
    where: { id: enrolment.id },
    data: { paidAmountUgx: newPaid },
  });

  // Instalment: mark the corresponding instalment paid and unlock next block
  const unpaidInstalment = instalments.find((i) => i.paidAt === null);
  if (unpaidInstalment) {
    await db.instalment.update({
      where: { id: unpaidInstalment.id },
      data: { paidAt: new Date(), paymentId: payment.id },
    });

    // Unlock block
    if (unpaidInstalment.unlocksBlockId) {
      const block = await db.block.findUnique({
        where: { id: unpaidInstalment.unlocksBlockId },
      });
      if (block) {
        await db.enrolment.update({
          where: { id: enrolment.id },
          data: { unlockedBlockOrder: Math.max(enrolment.unlockedBlockOrder, block.order) },
        });
      }
    }
  }

  // Full payment or all instalments paid → activate enrolment, unlock everything
  if (newPaid >= enrolment.totalAmountUgx) {
    await db.enrolment.update({
      where: { id: enrolment.id },
      data: { status: "ACTIVE", unlockedBlockOrder: 9999 },
    });
  } else if (enrolment.status === "PENDING_PAYMENT") {
    await db.enrolment.update({
      where: { id: enrolment.id },
      data: { status: "ACTIVE" },
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
    },
  });

  // Email receipt
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
      },
    });
  }

  // SMS confirmation
  if (user.phone) {
    await sendSms({
      to: user.phone,
      message: `MTC: Payment of UGX ${payment.amount.toLocaleString()} received for ${course.title}. Ref: ${payment.gatewayRef ?? payment.id}. Thank you!`,
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
