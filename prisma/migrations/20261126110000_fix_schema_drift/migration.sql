-- Fix schema drift: add all missing columns to match schema.prisma

-- SupportReply missing columns
ALTER TABLE "support_replies"
  ADD COLUMN IF NOT EXISTS "isStaff" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isInternal" BOOLEAN DEFAULT false;

-- SupportTicket missing columns
ALTER TABLE "support_tickets"
  ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "assignedTo" TEXT,
  ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "firstResponseAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "firstResponseTargetMinutes" INTEGER DEFAULT 240,
  ADD COLUMN IF NOT EXISTS "resolutionSummary" TEXT,
  ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "mergedIntoId" TEXT,
  ADD COLUMN IF NOT EXISTS "fileS3Key" TEXT;

-- Add constraints for SupportTicket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT constraint_name FROM information_schema.table_constraints 
    WHERE table_name = 'support_tickets' AND constraint_name = 'support_tickets_assignedTo_fkey'
  ) THEN
    ALTER TABLE "support_tickets"
      ADD CONSTRAINT "support_tickets_assignedTo_fkey"
      FOREIGN KEY ("assignedTo") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT constraint_name FROM information_schema.table_constraints 
    WHERE table_name = 'support_tickets' AND constraint_name = 'support_tickets_mergedIntoId_fkey'
  ) THEN
    ALTER TABLE "support_tickets"
      ADD CONSTRAINT "support_tickets_mergedIntoId_fkey"
      FOREIGN KEY ("mergedIntoId") REFERENCES "support_tickets"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ForumReply missing columns
ALTER TABLE "forum_replies"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Exam missing columns
ALTER TABLE "exams"
  ADD COLUMN IF NOT EXISTS "startWindowAt" TIMESTAMP(3);

-- Lessons missing columns  
ALTER TABLE "lessons"
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "releaseAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "visibleScope" TEXT DEFAULT 'ENROLLED';

-- Create missing indexes
CREATE INDEX IF NOT EXISTS "lessons_releaseAt_idx" ON "lessons"("releaseAt") WHERE "releaseAt" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "support_tickets_userId_status_idx" ON "support_tickets"("userId", "status");
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets"("status");
CREATE INDEX IF NOT EXISTS "support_tickets_assignedTo_idx" ON "support_tickets"("assignedTo");
CREATE INDEX IF NOT EXISTS "support_tickets_firstResponseAt_idx" ON "support_tickets"("firstResponseAt");
CREATE INDEX IF NOT EXISTS "support_tickets_mergedIntoId_idx" ON "support_tickets"("mergedIntoId");
CREATE INDEX IF NOT EXISTS "support_tickets_category_idx" ON "support_tickets"("category");
