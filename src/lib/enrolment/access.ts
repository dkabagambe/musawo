/**
 * Enrolment access helper.
 *
 * Single source of truth for "what can this student see?"
 * Used by server pages, API routes, and signed-URL generators.
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
  unlockedBlockOrder: number;
  provisionalUntil: Date | null;
  graceUntil: Date | null;
  overdueSince: Date | null;
}

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
      // Still within grace period → treat as PARTIAL (existing unlocked blocks stay open)
      if (graceUntil && graceUntil > now) return "OVERDUE";
      // Grace expired → same as PENDING (lock new blocks, content readable but not interactive)
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

/**
 * Returns true if the student may access a specific lesson.
 *
 * Rules:
 *  - isFree         → always accessible (even NONE)
 *  - isFreePreview  → accessible for PREVIEW and above
 *  - blockOrder <= unlockedBlockOrder → accessible for PARTIAL/FULL/OVERDUE(grace)/PROVISIONAL
 *  - FULL / COMPLETED / SPONSORED    → all blocks
 */
export function canAccessLesson(
  lesson: { isFree: boolean; isFreePreview: boolean },
  block: { order: number },
  enrolment: EnrolmentAccessInfo | null,
  now: Date = new Date()
): boolean {
  if (lesson.isFree) return true;

  const level = getAccessLevel(enrolment, now);

  if (level === "NONE") return false;
  if (level === "PREVIEW") return lesson.isFreePreview;
  if (level === "PENDING") return lesson.isFreePreview;

  if (level === "FULL" || level === "COMPLETED") return true;

  // PARTIAL, OVERDUE (grace), PROVISIONAL → check block order
  const unlocked = enrolment?.unlockedBlockOrder ?? 0;
  return block.order <= unlocked;
}

/**
 * Returns true if the student may access an exam.
 * Requires: block unlocked AND all lessons in the block completed.
 */
export function canAccessExam(
  block: { order: number },
  enrolment: EnrolmentAccessInfo | null,
  now: Date = new Date()
): boolean {
  const level = getAccessLevel(enrolment, now);
  if (level === "NONE" || level === "PREVIEW" || level === "PENDING") return false;
  if (level === "FULL" || level === "COMPLETED") return true;
  const unlocked = enrolment?.unlockedBlockOrder ?? 0;
  return block.order <= unlocked;
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
  const level = getAccessLevel(enrolment, now);
  const paid = level === "FULL" || level === "COMPLETED" || level === "PARTIAL" ||
               level === "OVERDUE" || level === "PROVISIONAL";

  return {
    registered: "done",
    paid:        paid ? "done" : "active",
    learning:    paid && hasCompletedLessons ? "done" : paid ? "active" : "locked",
    exams:       hasPassedExam ? "done" : paid ? "active" : "locked",
    certificate: hasCertificate ? "done" : enrolment?.status === "COMPLETED" ? "active" : "locked",
  };
}
