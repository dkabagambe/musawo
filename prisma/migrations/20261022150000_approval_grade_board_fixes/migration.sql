-- Add missing columns to approval_requests (MARKS_CHANGE support)
ALTER TABLE "approval_requests"
  ADD COLUMN IF NOT EXISTS "gradeEntryId" TEXT,
  ADD COLUMN IF NOT EXISTS "examId"        TEXT,
  ADD COLUMN IF NOT EXISTS "proposedScore" INTEGER;

-- Create BoardDocumentCategory enum
DO $$ BEGIN
  CREATE TYPE "BoardDocumentCategory" AS ENUM (
    'GENERAL', 'POLICY', 'MINUTES', 'REPORT', 'FINANCIAL', 'GOVERNANCE'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Migrate board_documents.category from TEXT to the new enum
ALTER TABLE "board_documents"
  ALTER COLUMN "category" DROP DEFAULT;

ALTER TABLE "board_documents"
  ALTER COLUMN "category" TYPE "BoardDocumentCategory"
  USING (
    CASE "category"
      WHEN 'POLICY'     THEN 'POLICY'::"BoardDocumentCategory"
      WHEN 'MINUTES'    THEN 'MINUTES'::"BoardDocumentCategory"
      WHEN 'REPORT'     THEN 'REPORT'::"BoardDocumentCategory"
      WHEN 'FINANCIAL'  THEN 'FINANCIAL'::"BoardDocumentCategory"
      WHEN 'GOVERNANCE' THEN 'GOVERNANCE'::"BoardDocumentCategory"
      ELSE 'GENERAL'::"BoardDocumentCategory"
    END
  );

ALTER TABLE "board_documents"
  ALTER COLUMN "category" SET DEFAULT 'GENERAL'::"BoardDocumentCategory";

-- Normalise grade_entries.releasedAt to timestamp(3) (no microseconds)
ALTER TABLE "grade_entries"
  ALTER COLUMN "releasedAt" TYPE TIMESTAMP(3)
  USING "releasedAt"::TIMESTAMP(3);

-- Rename live_class_reminders indexes to match the updated schema
DO $$ BEGIN
  ALTER INDEX "live_class_reminders_unique"  RENAME TO "live_class_reminders_liveClassId_channel_remindAt_key";
EXCEPTION WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
  ALTER INDEX "live_class_reminders_due_idx" RENAME TO "live_class_reminders_remindAt_sentAt_idx";
EXCEPTION WHEN undefined_object THEN null;
END $$;

-- Drop stale attendance index (replaced by a broader one in the schema)
DROP INDEX IF EXISTS "attendance_liveClassId_startMark_idx";

-- Drop stale board_documents indexes (recreated with corrected names below)
DROP INDEX IF EXISTS "board_documents_authorId_idx";
DROP INDEX IF EXISTS "board_documents_category_idx";

-- Drop stale live_classes index
DROP INDEX IF EXISTS "live_classes_status_scheduledAt_idx";
