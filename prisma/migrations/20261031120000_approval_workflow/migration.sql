-- Approval workflow: new states, types, reviewer fields, audit actions
-- remarks.md section 5

-- ── 1. Add new ApprovalRequestStatus values ────────────────────────────────
ALTER TYPE "ApprovalRequestStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "ApprovalRequestStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE "ApprovalRequestStatus" ADD VALUE IF NOT EXISTS 'IN_REVIEW';
ALTER TYPE "ApprovalRequestStatus" ADD VALUE IF NOT EXISTS 'APPLIED';
-- APPROVED, REJECTED, EXPIRED already exist

-- ── 2. Add new ApprovalRequestType values ──────────────────────────────────
ALTER TYPE "ApprovalRequestType" ADD VALUE IF NOT EXISTS 'ADMISSION';
ALTER TYPE "ApprovalRequestType" ADD VALUE IF NOT EXISTS 'ACADEMIC_PROGRAMME_CHANGE';
ALTER TYPE "ApprovalRequestType" ADD VALUE IF NOT EXISTS 'COURSE_CHANGE';
ALTER TYPE "ApprovalRequestType" ADD VALUE IF NOT EXISTS 'RESULTS_PUBLICATION';
ALTER TYPE "ApprovalRequestType" ADD VALUE IF NOT EXISTS 'CERTIFICATE_ISSUANCE';
ALTER TYPE "ApprovalRequestType" ADD VALUE IF NOT EXISTS 'PAYMENT_PROOF';
ALTER TYPE "ApprovalRequestType" ADD VALUE IF NOT EXISTS 'EQUIPMENT_REQUEST';
ALTER TYPE "ApprovalRequestType" ADD VALUE IF NOT EXISTS 'STORAGE_CLEARING';
ALTER TYPE "ApprovalRequestType" ADD VALUE IF NOT EXISTS 'ROLE_ASSIGNMENT';

-- ── 3. Add new AuditAction values ───────────────────────────────────────────
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'APPROVAL_FORWARDED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'APPROVAL_APPLIED';

-- ── 4. Add reviewer + courseId columns to approval_requests ─────────────────
-- (commit above ALTER VALUE calls first by ending this txn)
