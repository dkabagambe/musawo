-- T5: Remaining tabs schema additions

-- Lesson: add visibility fields (release date, archived, visible scope)
ALTER TABLE "lessons"
  ADD COLUMN IF NOT EXISTS "archivedAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "releaseAt"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "visibleScope" TEXT NOT NULL DEFAULT 'ENROLLED';
-- visibleScope values: ENROLLED | FREE_PREVIEW | FREE | CLASS | GROUP | HIDDEN

-- Announcement: add optional class-level scope
ALTER TABLE "announcements"
  ADD COLUMN IF NOT EXISTS "liveClassId" TEXT;

ALTER TABLE "announcements"
  ADD CONSTRAINT "announcements_liveClassId_fkey"
  FOREIGN KEY ("liveClassId") REFERENCES "live_classes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

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
