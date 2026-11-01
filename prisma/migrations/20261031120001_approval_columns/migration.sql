-- Add reviewer/courseId columns to approval_requests.
-- Runs after 20261031120000 has committed the new enum values.

ALTER TABLE "approval_requests"
  ADD COLUMN IF NOT EXISTS "reviewerId"  TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedAt"  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "reviewNote"  TEXT,
  ADD COLUMN IF NOT EXISTS "courseId"    TEXT;

-- Migrate existing PENDING rows -> SUBMITTED (the nearest equivalent)
UPDATE "approval_requests" SET "status" = 'SUBMITTED' WHERE "status" = 'PENDING';

-- Add reviewer index
CREATE INDEX IF NOT EXISTS "approval_requests_reviewerId_status_idx"
  ON "approval_requests"("reviewerId", "status");

-- Foreign key for reviewer
ALTER TABLE "approval_requests"
  ADD CONSTRAINT "approval_requests_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;
