-- Migration: marks_change_delegation_board_docs
-- Adds MARKS_CHANGE and BULK_EXPORT to ApprovalRequestType enum,
-- adds releasedAt / changeReason / changeApprovalId columns to GradeEntry,
-- adds the BoardDocument table, and adds delegation + marks-change audit actions.

-- ── 1. ApprovalRequestType: add MARKS_CHANGE and BULK_EXPORT ──────────────
ALTER TYPE "ApprovalRequestType" ADD VALUE IF NOT EXISTS 'MARKS_CHANGE';
ALTER TYPE "ApprovalRequestType" ADD VALUE IF NOT EXISTS 'BULK_EXPORT';

-- ── 2. GradeEntry: add release and change-audit columns ──────────────────
ALTER TABLE "grade_entries"
  ADD COLUMN IF NOT EXISTS "releasedAt"        TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "changeReason"      TEXT,
  ADD COLUMN IF NOT EXISTS "changeApprovalId"  TEXT;

-- ── 3. AuditAction: add new values ──────────────────────────────────────
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GRADE_RELEASED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GRADE_CHANGE_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GRADE_CHANGE_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DELEGATION_GRANTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DELEGATION_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BOARD_DOCUMENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BOARD_DOCUMENT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BOARD_DOCUMENT_DELETED';

-- ── 4. BoardDocument table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "board_documents" (
  "id"          TEXT          NOT NULL,
  "title"       TEXT          NOT NULL,
  "description" TEXT,
  "fileS3Key"   TEXT,
  "fileUrl"     TEXT,
  "category"    TEXT          NOT NULL DEFAULT 'GENERAL',
  "authorId"    TEXT          NOT NULL,
  "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "board_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "board_documents_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "board_documents_authorId_idx" ON "board_documents"("authorId");
CREATE INDEX IF NOT EXISTS "board_documents_category_idx" ON "board_documents"("category");
