/**
 * Enrolment access helper.
 *
 * Single source of truth for "what can this student see?"
 * Used by server pages, API routes, and signed-URL generators.
 *
 * Access is driven by paidPercent (0-100) rather than unlockedBlockOrder.
 * unlockedBlockOrder is kept for backward-compat.
 */

import type { EnrolmentStatus } from "@prisma/client";

export type AccessLevel =
  | "NONE"         // logged out or no enrolment record
  | "PREVIEW"      // registered, not enrolled — free-preview lessons only
  | "PENDING"      // payment initiated but not confirmed
  | "PROVISIONAL"  // bank transfer pending approval but provisional hours granted
  | "PARTIAL"      // instalment plan, some blocks unlocked
  | "OVERDUE"      // missed instalment, in grace period
  | "FULL"         // fully paid / sponsored
  | "COMPLETED";   // course finished

export interface EnrolmentAccessInfo {
  status: EnrolmentStatus | null;
  paidPercent: number;           // 0-100
  provisionalUntil: Date | null;
  graceUntil: Date | null;
  overdueSince: Date | null;
  unlockedBlockOrder?: number;   // kept for backward compat
}

// ─── Access thresholds ─────────────────────────────────────────────────────

export const DEFAULT_ACCESS_THRESHOLDS = {
  preview: 0,
  block1: 25,
  block2: 50,
  block3: 75,
  final: 100,
} as const;

export type AccessThresholds = typeof DEFAULT_ACCESS_THRESHOLDS;

// ─── getAccessLevel ────────────────────────────────────────────────────────

/**
 * Derive the access level from an enrolment record.
 * Pass null when there is no enrolment row at all.
 */
export function getAccessLevel(
  enrolment: EnrolmentAccessInfo | null,
  now: Date = new Date()
): AccessLevel {
  if (!enrolment || !enrolment.status) return "PREVIEW";

  const { status, provisionalUntil, graceUntil } = enrolment;

  switch (status) {
    case "PENDING_PAYMENT":
      // Provisional bank-transfer access?
      if (provisionalUntil && provisionalUntil > now) return "PROVISIONAL";
      return "PENDING";

    case "ACTIVE":
      return "FULL";

    case "PARTIALLY_PAID":
      return "PARTIAL";

    case "OVERDUE":
      // Still within grace period → treat as OVERDUE (existing unlocked blocks stay open)
      if (graceUntil && graceUntil > now) return "OVERDUE";
      // Grace expired → same as PENDING (lock new blocks)
      return "PENDING";

    case "SPONSORED":
      return "FULL";

    case "COMPLETED":
      return "COMPLETED";

    case "SUSPENDED":
    case "REFUNDED":
    case "CANCELLED":
      return "NONE";

    default:
      return "PREVIEW";
  }
}

// ─── canAccessLesson ───────────────────────────────────────────────────────

/**
 * Returns true if the student may access a specific lesson.
 *
 * Rules:
 *  - isFree         → always accessible (even NONE)
 *  - isFreePreview  → accessible for PREVIEW and above
 *  - FULL/COMPLETED/SPONSORED → all blocks
 *  - PARTIAL/OVERDUE(grace)/PROVISIONAL → check paidPercent vs thresholds
 */
export function canAccessLesson(
  lesson: { isFree: boolean; isFreePreview: boolean },
  block: { order: number },
  enrolment: EnrolmentAccessInfo | null,
  now: Date = new Date(),
  thresholds: AccessThresholds = DEFAULT_ACCESS_THRESHOLDS
): boolean {
  if (lesson.isFree) return true;

  const level = getAccessLevel(enrolment, now);

  if (level === "NONE") return false;
  if (level === "PREVIEW") return lesson.isFreePreview;
  if (level === "PENDING") return lesson.isFreePreview;

  if (level === "FULL" || level === "COMPLETED") return true;

  // PROVISIONAL: only block1 lessons
  if (level === "PROVISIONAL") {
    return block.order === 1;
  }

  // PARTIAL or OVERDUE (grace) → check paidPercent vs thresholds
  const pct = enrolment?.paidPercent ?? 0;
  return _lessonAllowedByPercent(block.order, pct, thresholds);
}

function _lessonAllowedByPercent(
  blockOrder: number,
  paidPercent: number,
  thresholds: AccessThresholds
): boolean {
  if (blockOrder >= 4) return paidPercent >= thresholds.final;
  if (blockOrder === 3) return paidPercent >= thresholds.block3;
  if (blockOrder === 2) return paidPercent >= thresholds.block2;
  return paidPercent >= thresholds.block1; // block1
}

// ─── getLockedReason ───────────────────────────────────────────────────────

/**
 * Returns null if accessible, otherwise a human-readable reason string.
 */
export function getLockedReason(
  block: { order: number },
  enrolment: EnrolmentAccessInfo | null,
  thresholds: AccessThresholds = DEFAULT_ACCESS_THRESHOLDS,
  now: Date = new Date()
): string | null {
  const level = getAccessLevel(enrolment, now);

  if (level === "NONE") return "Enrol to access this content";
  if (level === "PREVIEW" || level === "PENDING") {
    return "Awaiting payment confirmation";
  }
  if (level === "FULL" || level === "COMPLETED") return null;

  if (level === "PROVISIONAL") {
    if (block.order === 1) return null;
    return _lockedReasonByBlock(block.order);
  }

  // PARTIAL or OVERDUE
  if (level === "OVERDUE") {
    const pct = enrolment?.paidPercent ?? 0;
    if (_lessonAllowedByPercent(block.order, pct, thresholds)) {
      return "Your instalment is overdue - pay now to maintain access";
    }
    return _lockedReasonByBlock(block.order);
  }

  const pct = enrolment?.paidPercent ?? 0;
  if (_lessonAllowedByPercent(block.order, pct, thresholds)) return null;
  return _lockedReasonByBlock(block.order);
}

function _lockedReasonByBlock(blockOrder: number): string {
  if (blockOrder === 1) return "Pay 25% deposit to unlock Block 1";
  if (blockOrder === 2) return "Pay 50% to unlock Block 2 and take the Block 1 exam";
  if (blockOrder === 3) return "Pay 75% to unlock Block 3 and book your practical day";
  return "Pay in full to access the final exam and earn your certificate";
}

// ─── canAccess (unified) ───────────────────────────────────────────────────

type ResourceType =
  | "lesson"
  | "lesson_notes"
  | "exam"
  | "forum"
  | "certificate"
  | "practical_booking"
  | "preview_lesson"
  | "resource_library";

/**
 * Unified resource access check.
 */
export function canAccess(
  resource: { type: ResourceType; blockOrder?: number },
  enrolment: EnrolmentAccessInfo | null,
  thresholds: AccessThresholds = DEFAULT_ACCESS_THRESHOLDS,
  now: Date = new Date()
): { allowed: boolean; reason: string | null } {
  const level = getAccessLevel(enrolment, now);
  const pct = enrolment?.paidPercent ?? 0;

  // Always allowed
  if (resource.type === "resource_library" || resource.type === "preview_lesson") {
    return { allowed: true, reason: null };
  }

  // Suspended → nothing allowed
  if (level === "NONE") {
    return { allowed: false, reason: "Enrol to access this content" };
  }

  if (enrolment?.status === "SUSPENDED") {
    return { allowed: false, reason: "Your account has been suspended" };
  }

  // Forum: need at least PARTIAL
  if (resource.type === "forum") {
    const allowed =
      level === "FULL" || level === "PARTIAL" || level === "OVERDUE" ||
      level === "COMPLETED" || level === "PROVISIONAL";
    return {
      allowed,
      reason: allowed ? null : "Enrol and start your course to join the forum",
    };
  }

  // PENDING / PREVIEW: only previews
  if (level === "PENDING" || level === "PREVIEW") {
    return { allowed: false, reason: "Awaiting payment confirmation" };
  }

  // FULL / COMPLETED → most things allowed unless certificate needs COMPLETED
  if (level === "FULL" || level === "COMPLETED") {
    if (resource.type === "certificate") {
      const allowed =
        enrolment?.status === "COMPLETED" ||
        enrolment?.status === "ACTIVE" ||
        enrolment?.status === "SPONSORED";
      return {
        allowed,
        reason: allowed ? null : "Complete all course requirements to earn your certificate",
      };
    }
    // Exam gating by pct for FULL (pct=100)
    if (resource.type === "exam") {
      return _examAccess(resource.blockOrder ?? 1, pct, thresholds, level);
    }
    return { allowed: true, reason: null };
  }

  // PROVISIONAL: lesson block1 and nothing else
  if (level === "PROVISIONAL") {
    if (resource.type === "lesson" && (resource.blockOrder ?? 1) === 1) {
      return { allowed: true, reason: null };
    }
    return {
      allowed: false,
      reason: "Provisional access: only Block 1 lessons available while payment is confirmed",
    };
  }

  // PARTIAL or OVERDUE (grace)
  const blockOrder = resource.blockOrder ?? 1;

  if (resource.type === "lesson" || resource.type === "lesson_notes") {
    const allowed = _lessonAllowedByPercent(blockOrder, pct, thresholds);
    return {
      allowed,
      reason: allowed ? null : _lockedReasonByBlock(blockOrder),
    };
  }

  if (resource.type === "exam") {
    return _examAccess(blockOrder, pct, thresholds, level);
  }

  if (resource.type === "practical_booking") {
    const allowed = pct >= thresholds.block3;
    return {
      allowed,
      reason: allowed ? null : "Pay 75% to unlock Block 3 and book your practical day",
    };
  }

  if (resource.type === "certificate") {
    const allowed =
      pct >= thresholds.final &&
      (enrolment?.status === "COMPLETED" || enrolment?.status === "ACTIVE" || enrolment?.status === "SPONSORED");
    return {
      allowed,
      reason: allowed ? null : "Pay in full to access the final exam and earn your certificate",
    };
  }

  return { allowed: false, reason: "Access denied" };
}

function _examAccess(
  blockOrder: number,
  pct: number,
  thresholds: AccessThresholds,
  level: AccessLevel
): { allowed: boolean; reason: string | null } {
  // Final exam (blockOrder >= 3)
  if (blockOrder >= 3) {
    const allowed = pct >= thresholds.final || level === "FULL" || level === "COMPLETED";
    return {
      allowed,
      reason: allowed ? null : "Pay in full to access the final exam and earn your certificate",
    };
  }
  // Block 2 exam
  if (blockOrder === 2) {
    const allowed = pct >= thresholds.block3;
    return {
      allowed,
      reason: allowed ? null : "Pay 75% to unlock Block 3 and book your practical day",
    };
  }
  // Block 1 exam
  const allowed = pct >= thresholds.block2;
  return {
    allowed,
    reason: allowed ? null : "Pay 50% to unlock Block 2 and take the Block 1 exam",
  };
}

// ─── canAccessExam (backward-compat) ───────────────────────────────────────

/**
 * Returns true if the student may access an exam.
 */
export function canAccessExam(
  block: { order: number },
  enrolment: EnrolmentAccessInfo | null,
  now: Date = new Date()
): boolean {
  const level = getAccessLevel(enrolment, now);
  if (level === "NONE" || level === "PREVIEW" || level === "PENDING") return false;
  if (level === "FULL" || level === "COMPLETED") return true;
  const pct = enrolment?.paidPercent ?? 0;
  return _lessonAllowedByPercent(block.order, pct, DEFAULT_ACCESS_THRESHOLDS);
}

/** Returns true if the student may post in the forum. */
export function canPostInForum(enrolment: EnrolmentAccessInfo | null, now: Date = new Date()): boolean {
  const level = getAccessLevel(enrolment, now);
  return level === "FULL" || level === "PARTIAL" || level === "OVERDUE" ||
         level === "COMPLETED" || level === "PROVISIONAL";
}

/** Returns true if the student may download their certificate. */
export function canDownloadCertificate(enrolment: EnrolmentAccessInfo | null): boolean {
  return enrolment?.status === "COMPLETED" || enrolment?.status === "ACTIVE" ||
         enrolment?.status === "SPONSORED";
}

/**
 * Human-readable label for the enrolment status shown on the dashboard.
 */
export function enrolmentStatusLabel(status: EnrolmentStatus | null): string {
  switch (status) {
    case "PENDING_PAYMENT": return "Payment pending";
    case "ACTIVE":          return "Active";
    case "PARTIALLY_PAID":  return "Partially paid";
    case "OVERDUE":         return "Overdue";
    case "SPONSORED":       return "Sponsored";
    case "COMPLETED":       return "Completed";
    case "SUSPENDED":       return "Suspended";
    case "REFUNDED":        return "Refunded";
    case "CANCELLED":       return "Cancelled";
    default:                return "Not enrolled";
  }
}

/**
 * The progress stepper steps for the student dashboard.
 */
export type StepperStep = "registered" | "paid" | "learning" | "exams" | "certificate";

export function getStepperState(
  enrolment: EnrolmentAccessInfo | null,
  hasCompletedLessons: boolean,
  hasPassedExam: boolean,
  hasCertificate: boolean,
  now: Date = new Date()
): Record<StepperStep, "done" | "active" | "locked"> {
  const pct = enrolment?.paidPercent ?? 0;

  return {
    registered:  "done",
    paid:        pct > 0 ? "done" : "active",
    learning:    pct >= 25 && hasCompletedLessons ? "done" : pct >= 25 ? "active" : "locked",
    exams:       hasPassedExam ? "done" : pct >= 50 ? "active" : "locked",
    certificate: hasCertificate ? "done" : enrolment?.status === "COMPLETED" ? "active" : "locked",
  };
}
