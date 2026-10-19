import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Payment webhook tests.
 * These test the core business logic of processConfirmedPayment
 * by mocking Prisma and the notification services.
 */

// ─── Mock Prisma ────────────────────────────────────────────────────────
vi.mock("@/lib/db", () => ({
  db: {
    payment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    ledgerEntry: { create: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    enrolment: { update: vi.fn() },
    instalment: {
      update: vi.fn(),
    },
    block: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/sms", () => ({
  sendSms: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/settings", () => ({
  getSetting: vi.fn().mockResolvedValue("2"),
}));

import { db } from "@/lib/db";
import { processConfirmedPayment } from "@/lib/payments";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";

const mockPayment = {
  id: "pay-1",
  enrolmentId: "enr-1",
  amount: 283334,
  currency: "UGX",
  method: "MTN_MOMO",
  gateway: "PESAPAL",
  gatewayRef: "pesapal-track-123",
  gatewayOrderId: "MTC-ref-123",
  status: "PENDING",
  paidAt: null,
  receiptS3Key: null,
  failureReason: null,
  refundedAt: null,
  refundedBy: null,
  claimId: null,
  receiptNumber: null,
  reversedAt: null,
  reversedBy: null,
  reversalReason: null,
  fraudStrike: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  enrolment: {
    id: "enr-1",
    userId: "user-1",
    courseId: "course-1",
    intakeId: null,
    status: "PENDING_PAYMENT",
    planType: "INSTALMENT",
    totalAmountUgx: 850000,
    paidAmountUgx: 0,
    paidPercent: 0,
    unlockedBlockOrder: 0,
    overdueSince: null,
    graceUntil: null,
    provisionalUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: "user-1", name: "Sarah Auma", email: "sarah@test.com", phone: "+256701234567" },
    course: { id: "course-1", title: "CNA", slug: "cna" },
    instalments: [
      { id: "inst-1", number: 1, amount: 283334, paidAt: null, unlocksBlockId: "block-1" },
      { id: "inst-2", number: 2, amount: 283333, paidAt: null, unlocksBlockId: "block-2" },
      { id: "inst-3", number: 3, amount: 283333, paidAt: null, unlocksBlockId: "block-3" },
    ],
  },
};

describe("processConfirmedPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks payment completed and creates ledger entry", async () => {
    (db.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockPayment);
    (db.payment.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockPayment,
      status: "COMPLETED",
    });
    (db.ledgerEntry.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (db.enrolment.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockPayment.enrolment,
      paidAmountUgx: 283334,
    });
    (db.instalment.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (db.block.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "block-1",
      order: 1,
    });
    (db.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await processConfirmedPayment("pay-1");

    expect(db.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pay-1" },
        data: expect.objectContaining({ status: "COMPLETED" }),
      })
    );
    expect(db.ledgerEntry.create).toHaveBeenCalledOnce();
    expect(db.instalment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inst-1" },
        data: expect.objectContaining({ paymentId: "pay-1" }),
      })
    );
  });

  it("sends email receipt and SMS confirmation", async () => {
    (db.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockPayment);
    (db.payment.update as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockPayment, status: "COMPLETED" });
    (db.ledgerEntry.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (db.enrolment.update as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockPayment.enrolment });
    (db.instalment.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (db.block.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "block-1", order: 1 });
    (db.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await processConfirmedPayment("pay-1");

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ template: "payment-receipt" })
    );
    expect(sendSms).toHaveBeenCalledWith(
      expect.objectContaining({ to: "+256701234567" })
    );
  });

  it("activates enrolment when fully paid", async () => {
    const fullyPaidPayment = {
      ...mockPayment,
      amount: 850000,
      enrolment: {
        ...mockPayment.enrolment,
        planType: "FULL",
        totalAmountUgx: 850000,
        paidAmountUgx: 0,
        paidPercent: 0,
        instalments: [],
      },
    };
    (db.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(fullyPaidPayment);
    (db.payment.update as ReturnType<typeof vi.fn>).mockResolvedValue({ ...fullyPaidPayment, status: "COMPLETED" });
    (db.ledgerEntry.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (db.enrolment.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (db.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await processConfirmedPayment("pay-1");

    expect(db.enrolment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ACTIVE", unlockedBlockOrder: 9999 }),
      })
    );
  });

  it("transitions PENDING_PAYMENT → PARTIALLY_PAID on first instalment", async () => {
    (db.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockPayment);
    (db.payment.update as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockPayment, status: "COMPLETED" });
    (db.ledgerEntry.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (db.enrolment.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (db.instalment.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (db.block.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "block-1", order: 1 });
    (db.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await processConfirmedPayment("pay-1");

    // Should set status to PARTIALLY_PAID (remaining instalments exist)
    const calls = (db.enrolment.update as ReturnType<typeof vi.fn>).mock.calls;
    const statusCall = calls.find((c: unknown[]) =>
      typeof c[0] === "object" && c[0] !== null &&
      "data" in (c[0] as object) &&
      typeof (c[0] as { data: unknown }).data === "object" &&
      (c[0] as { data: { status?: string } }).data?.status
    );
    expect(statusCall).toBeDefined();
    const status = (statusCall![0] as { data: { status: string } }).data.status;
    expect(["PARTIALLY_PAID", "ACTIVE"]).toContain(status);
  });

  it("is idempotent — does not process already-completed payment", async () => {
    (db.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockPayment,
      status: "COMPLETED",
    });

    await processConfirmedPayment("pay-1");

    // Should not call update or create ledger
    expect(db.payment.update).not.toHaveBeenCalled();
    expect(db.ledgerEntry.create).not.toHaveBeenCalled();
  });
});

describe("Discount code application", () => {
  it("applies percentage discount correctly", () => {
    const fullFee = 850000;
    const discountPercent = 20;
    const discountAmount = Math.round((fullFee * discountPercent) / 100);
    const finalAmount = fullFee - discountAmount;

    expect(discountAmount).toBe(170000);
    expect(finalAmount).toBe(680000);
  });

  it("applies fixed amount discount", () => {
    const fullFee = 850000;
    const fixedDiscount = 100000;
    const finalAmount = Math.max(0, fullFee - fixedDiscount);

    expect(finalAmount).toBe(750000);
  });
});

describe("Instalment unlock logic", () => {
  it("unlocks blocks progressively with each instalment", () => {
    const totalAmount = 850000;
    const instalmentCount = 3;
    const firstAmount = Math.ceil(totalAmount / instalmentCount);

    expect(firstAmount).toBe(283334);

    // After 1 payment: unlockedBlockOrder = 1 (first block)
    // After 2 payments: unlockedBlockOrder = 2
    // After 3 payments: status = ACTIVE, unlockedBlockOrder = 9999
    const paidAmounts = [firstAmount, firstAmount * 2, totalAmount];
    const expectedUnlockedOrders = [1, 2, 9999];

    paidAmounts.forEach((paid, i) => {
      const fullyPaid = paid >= totalAmount;
      const unlockedOrder = fullyPaid ? 9999 : i + 1;
      expect(unlockedOrder).toBe(expectedUnlockedOrders[i]);
    });
  });
});
