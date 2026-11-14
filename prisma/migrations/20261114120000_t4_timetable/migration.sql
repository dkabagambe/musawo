-- T4 Timetable: add scheduling metadata fields to live_classes

-- Add RESCHEDULED to LiveClassStatus enum
ALTER TYPE "LiveClassStatus" ADD VALUE IF NOT EXISTS 'RESCHEDULED';

-- Add new columns to live_classes
ALTER TABLE "live_classes"
  ADD COLUMN IF NOT EXISTS "venue"               TEXT,
  ADD COLUMN IF NOT EXISTS "cancelReason"        TEXT,
  ADD COLUMN IF NOT EXISTS "rescheduleReason"    TEXT,
  ADD COLUMN IF NOT EXISTS "originalScheduledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "repeatWeeklyUntil"   TIMESTAMP(3);

-- Additional index for tutor schedule queries
CREATE INDEX IF NOT EXISTS "live_classes_tutorId_scheduledAt_idx" ON "live_classes"("tutorId", "scheduledAt");
