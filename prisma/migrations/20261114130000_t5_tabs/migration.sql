-- T5: Remaining tabs schema additions

-- Lesson: add visibility fields (release date, archived, visible scope)
ALTER TABLE "lessons"
  ADD COLUMN IF NOT EXISTS "archivedAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "releaseAt"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "visibleScope" TEXT NOT NULL DEFAULT 'ENROLLED';
-- visibleScope values: ENROLLED | FREE_PREVIEW | FREE | CLASS | GROUP | HIDDEN

-- Announcement: add all missing columns
ALTER TABLE "announcements"
  ADD COLUMN IF NOT EXISTS "audienceType" TEXT DEFAULT 'ALL',
  ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'PUBLISHED',
  ADD COLUMN IF NOT EXISTS "pinned" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "targetIntakeId" TEXT,
  ADD COLUMN IF NOT EXISTS "createdById" TEXT,
  ADD COLUMN IF NOT EXISTS "liveClassId" TEXT;

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT constraint_name FROM information_schema.table_constraints 
    WHERE table_name = 'announcements' AND constraint_name = 'announcements_liveClassId_fkey'
  ) THEN
    ALTER TABLE "announcements"
      ADD CONSTRAINT "announcements_liveClassId_fkey"
      FOREIGN KEY ("liveClassId") REFERENCES "live_classes"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
  
  IF NOT EXISTS (
    SELECT constraint_name FROM information_schema.table_constraints 
    WHERE table_name = 'announcements' AND constraint_name = 'announcements_targetIntakeId_fkey'
  ) THEN
    ALTER TABLE "announcements"
      ADD CONSTRAINT "announcements_targetIntakeId_fkey"
      FOREIGN KEY ("targetIntakeId") REFERENCES "intakes"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT constraint_name FROM information_schema.table_constraints 
    WHERE table_name = 'announcements' AND constraint_name = 'announcements_createdById_fkey'
  ) THEN
    ALTER TABLE "announcements"
      ADD CONSTRAINT "announcements_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- SupportTicket: add file attachment
ALTER TABLE "support_tickets"
  ADD COLUMN IF NOT EXISTS "fileS3Key" TEXT;

-- ForumReply: add soft-delete for moderation
ALTER TABLE "forum_replies"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Exam: add start-window (optional time before exam goes live)
ALTER TABLE "exams"
  ADD COLUMN IF NOT EXISTS "startWindowAt" TIMESTAMP(3);

-- Index for materials release-date queries
CREATE INDEX IF NOT EXISTS "lessons_releaseAt_idx" ON "lessons"("releaseAt") WHERE "releaseAt" IS NOT NULL;
