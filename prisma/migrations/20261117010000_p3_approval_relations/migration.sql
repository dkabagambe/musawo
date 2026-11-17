-- P3: Add relations for ApprovalRequest to User (student), Course, and Exam
-- These columns already existed from a previous db push; this migration just records them

ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "studentId" TEXT REFERENCES "users"("id");
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "courseId" TEXT REFERENCES "courses"("id");
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "examId" TEXT REFERENCES "exams"("id");

CREATE INDEX IF NOT EXISTS "approval_requests_studentId_idx" ON "approval_requests"("studentId");
CREATE INDEX IF NOT EXISTS "approval_requests_courseId_idx" ON "approval_requests"("courseId");
