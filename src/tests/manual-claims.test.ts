/**
 * Manual payment claims + percentage-based access tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  canAccess,
  getLockedReason,
  DEFAULT_ACCESS_THRESHOLDS,
  type EnrolmentAccessInfo,
} from "@/lib/enrolment/access";
import { assertNotSelfApproval, ForbiddenError } from "@/lib/rbac";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function enr(
  status: EnrolmentAccessInfo["status"],
  paidPercent: number,
  opts: Partial<EnrolmentAccessInfo> = {}
): EnrolmentAccessInfo {
  return {
    status,
    paidPercent,
    unlockedBlockOrder: 0,
    provisionalUntil: null,
    graceUntil: null,
    overdueSince: null,
    ...opts,
  };
}

const T = DEFAULT_ACCESS_THRESHOLDS;

// ─── 1. canAccess at 0% paidPercent ──────────────────────────────────────────

describe("canAccess at 0% paidPercent (PENDING_PAYMENT)", () => {
  const e = enr("PENDING_PAYMENT", 0);

  it("block1 lesson denied", () => {
    expect(canAccess({ type: "lesson", blockOrder: 1 }, e, T).allowed).toBe(false);
  });

  it("preview_lesson always allowed", () => {
    expect(canAccess({ type: "preview_lesson" }, e, T).allowed).toBe(true);
  });

  it("resource_library always allowed", () => {
    expect(canAccess({ type: "resource_library" }, e, T).allowed).toBe(true);
  });
});

// ─── 2. canAccess at 25% paidPercent ─────────────────────────────────────────

describe("canAccess at 25% paidPercent (PARTIALLY_PAID)", () => {
  const e = enr("PARTIALLY_PAID", 25);

  it("block1 lesson allowed", () => {
    expect(canAccess({ type: "lesson", blockOrder: 1 }, e, T).allowed).toBe(true);
  });

  it("block2 lesson denied", () => {
    expect(canAccess({ type: "lesson", blockOrder: 2 }, e, T).allowed).toBe(false);
  });

  it("getLockedReason for block2 returns correct string", () => {
    const reason = getLockedReason({ order: 2 }, e, T);
    expect(reason).toBe("Pay 50% to unlock Block 2 and take the Block 1 exam");
  });
});

// ─── 3. canAccess at 50% paidPercent ─────────────────────────────────────────

describe("canAccess at 50% paidPercent (PARTIALLY_PAID)", () => {
  const e = enr("PARTIALLY_PAID", 50);

  it("block2 lesson allowed", () => {
    expect(canAccess({ type: "lesson", blockOrder: 2 }, e, T).allowed).toBe(true);
  });

  it("block1 exam (blockOrder=1) allowed at 50%", () => {
    expect(canAccess({ type: "exam", blockOrder: 1 }, e, T).allowed).toBe(true);
  });

  it("block2 exam (blockOrder=2) denied at 50%", () => {
    expect(canAccess({ type: "exam", blockOrder: 2 }, e, T).allowed).toBe(false);
  });
});

// ─── 4. canAccess at 75% paidPercent ─────────────────────────────────────────

describe("canAccess at 75% paidPercent (PARTIALLY_PAID)", () => {
  const e = enr("PARTIALLY_PAID", 75);

  it("block3 lesson allowed", () => {
    expect(canAccess({ type: "lesson", blockOrder: 3 }, e, T).allowed).toBe(true);
  });

  it("practical_booking allowed", () => {
    expect(canAccess({ type: "practical_booking" }, e, T).allowed).toBe(true);
  });

  it("final exam (blockOrder=3) denied at 75%", () => {
    expect(canAccess({ type: "exam", blockOrder: 3 }, e, T).allowed).toBe(false);
  });
});

// ─── 5. canAccess at 100% paidPercent ────────────────────────────────────────

describe("canAccess at 100% paidPercent (ACTIVE)", () => {
  const e = enr("ACTIVE", 100);

  it("final exam (blockOrder=3) allowed", () => {
    expect(canAccess({ type: "exam", blockOrder: 3 }, e, T).allowed).toBe(true);
  });

  it("certificate allowed when ACTIVE", () => {
    expect(canAccess({ type: "certificate" }, e, T).allowed).toBe(true);
  });
});

// ─── 6. ACTIVE status, paidPercent=100 ───────────────────────────────────────

describe("ACTIVE status (paidPercent=100)", () => {
  const e = enr("ACTIVE", 100);

  it("block1 lesson allowed — FULL access", () => {
    expect(canAccess({ type: "lesson", blockOrder: 1 }, e, T).allowed).toBe(true);
  });

  it("block4 lesson allowed", () => {
    expect(canAccess({ type: "lesson", blockOrder: 4 }, e, T).allowed).toBe(true);
  });
});

// ─── 7. Provisional access ────────────────────────────────────────────────────

describe("Provisional access (provisionalUntil in future, paidPercent=0)", () => {
  const future = new Date(Date.now() + 3_600_000);
  const e = enr("PENDING_PAYMENT", 0, { provisionalUntil: future });

  it("lesson block1 allowed", () => {
    expect(canAccess({ type: "lesson", blockOrder: 1 }, e, T).allowed).toBe(true);
  });

  it("lesson_notes denied", () => {
    expect(canAccess({ type: "lesson_notes", blockOrder: 1 }, e, T).allowed).toBe(false);
  });

  it("exam denied", () => {
    expect(canAccess({ type: "exam", blockOrder: 1 }, e, T).allowed).toBe(false);
  });
});

// ─── 8. Overdue in grace period at paidPercent=50 ────────────────────────────

describe("Overdue in grace period at paidPercent=50", () => {
  const future = new Date(Date.now() + 86_400_000);
  const e = enr("OVERDUE", 50, { graceUntil: future });

  it("block2 lesson allowed at 50%", () => {
    expect(canAccess({ type: "lesson", blockOrder: 2 }, e, T).allowed).toBe(true);
  });

  it("block3 lesson denied at 50%", () => {
    expect(canAccess({ type: "lesson", blockOrder: 3 }, e, T).allowed).toBe(false);
  });
});

// ─── 9. Dual control: assertNotSelfApproval ───────────────────────────────────

describe("assertNotSelfApproval", () => {
  it("throws ForbiddenError when same IDs", () => {
    expect(() => assertNotSelfApproval("user-1", "user-1")).toThrow(ForbiddenError);
  });

  it("does not throw when different IDs", () => {
    expect(() => assertNotSelfApproval("user-1", "user-2")).not.toThrow();
  });
});

// ─── 10. Webhook idempotency ──────────────────────────────────────────────────

describe("Webhook idempotency: processConfirmedPayment on already-COMPLETED payment", () => {
  vi.mock("@/lib/db", () => ({
    db: {
      payment: { findUnique: vi.fn(), update: vi.fn() },
      ledgerEntry: { create: vi.fn(), count: vi.fn().mockResolvedValue(0) },
      enrolment: { update: vi.fn() },
      instalment: { update: vi.fn() },
      block: { findUnique: vi.fn() },
      auditLog: { create: vi.fn() },
    },
  }));
  vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
  vi.mock("@/lib/sms", () => ({ sendSms: vi.fn().mockResolvedValue(undefined) }));
  vi.mock("@/lib/settings", () => ({ getSetting: vi.fn().mockResolvedValue("2") }));

  beforeEach(() => vi.clearAllMocks());

  it("does nothing when payment is already COMPLETED", async () => {
    const { db } = await import("@/lib/db");
    const { processConfirmedPayment } = await import("@/lib/payments");

    (db.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "pay-x",
      status: "COMPLETED",
      enrolmentId: "enr-x",
      amount: 100000,
      enrolment: {
        id: "enr-x",
        userId: "u1",
        paidAmountUgx: 100000,
        paidPercent: 100,
        totalAmountUgx: 100000,
        unlockedBlockOrder: 9999,
        status: "ACTIVE",
        instalments: [],
        user: { id: "u1", name: "Test", email: null, phone: null },
        course: { id: "c1", title: "CNA", slug: "cna" },
      },
    });

    await processConfirmedPayment("pay-x");

    expect(db.payment.update).not.toHaveBeenCalled();
    expect(db.ledgerEntry.create).not.toHaveBeenCalled();
  });
});

// ─── 11. reverseVerifiedPayment recomputes paidPercent ───────────────────────

describe("reverseVerifiedPayment recomputes paidPercent", () => {
  vi.mock("@/lib/db", () => ({
    db: {
      payment: {
        findUnique: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
      ledgerEntry: { create: vi.fn(), count: vi.fn().mockResolvedValue(0) },
      enrolment: { update: vi.fn() },
      user: { update: vi.fn() },
      auditLog: { create: vi.fn() },
    },
  }));
  vi.mock("@/lib/settings", () => ({ getSetting: vi.fn().mockResolvedValue("2") }));

  beforeEach(() => vi.clearAllMocks());

  it("sets paidPercent to 0 when all payments reversed", async () => {
    const { db } = await import("@/lib/db");
    const { reverseVerifiedPayment } = await import("@/lib/payments");

    const mockEnrolment = {
      id: "enr-1",
      userId: "u1",
      paidAmountUgx: 283334,
      paidPercent: 33,
      totalAmountUgx: 850000,
      unlockedBlockOrder: 1,
      status: "PARTIALLY_PAID",
    };

    (db.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "pay-1",
      status: "COMPLETED",
      amount: 283334,
      enrolment: mockEnrolment,
    });
    (db.payment.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (db.ledgerEntry.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
    // No remaining payments after reversal
    (db.payment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (db.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({ fraudStrikes: 1 });
    (db.enrolment.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (db.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await reverseVerifiedPayment("pay-1", "staff-1", "Fraudulent");

    expect(db.enrolment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paidPercent: 0, paidAmountUgx: 0 }),
      })
    );
  });
});

// ─── 12. getLockedReason ─────────────────────────────────────────────────────

describe("getLockedReason", () => {
  it("returns null for accessible block (paidPercent=25, block1)", () => {
    const e = enr("PARTIALLY_PAID", 25);
    expect(getLockedReason({ order: 1 }, e, T)).toBeNull();
  });

  it("returns correct string for locked block2 at 25%", () => {
    const e = enr("PARTIALLY_PAID", 25);
    expect(getLockedReason({ order: 2 }, e, T)).toBe(
      "Pay 50% to unlock Block 2 and take the Block 1 exam"
    );
  });

  it("returns correct string for locked block3 at 50%", () => {
    const e = enr("PARTIALLY_PAID", 50);
    expect(getLockedReason({ order: 3 }, e, T)).toBe(
      "Pay 75% to unlock Block 3 and book your practical day"
    );
  });

  it("returns correct string for locked final at 75%", () => {
    const e = enr("PARTIALLY_PAID", 75);
    expect(getLockedReason({ order: 4 }, e, T)).toBe(
      "Pay in full to access the final exam and earn your certificate"
    );
  });

  it("returns null when FULL access", () => {
    const e = enr("ACTIVE", 100);
    expect(getLockedReason({ order: 5 }, e, T)).toBeNull();
  });
});
