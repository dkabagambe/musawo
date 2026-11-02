-- Section 11: Concurrency indexes for hot query paths
-- NOTE: CONCURRENTLY removed — Prisma runs migrations inside a transaction
-- and PostgreSQL does not allow CREATE INDEX CONCURRENTLY inside a transaction.
-- Plain CREATE INDEX IF NOT EXISTS acquires a ShareLock which is fine for a
-- deploy-time migration (table writes queue briefly, no data loss).

-- ExamAttempt: hot in every exam session
CREATE INDEX IF NOT EXISTS "exam_attempts_examId_userId_idx"
    ON "exam_attempts"("examId", "userId");

CREATE INDEX IF NOT EXISTS "exam_attempts_userId_status_idx"
    ON "exam_attempts"("userId", "status");

-- Partial index for auto-submit cron (timed-out in-progress attempts)
CREATE INDEX IF NOT EXISTS "exam_attempts_timeLimitEndsAt_status_idx"
    ON "exam_attempts"("timeLimitEndsAt", "status")
    WHERE "status" = 'IN_PROGRESS' AND "timeLimitEndsAt" IS NOT NULL;

-- LiveClass: queried on every presence heartbeat and roll-call
CREATE INDEX IF NOT EXISTS "live_classes_courseId_status_idx"
    ON "live_classes"("courseId", "status");

CREATE INDEX IF NOT EXISTS "live_classes_tutorId_status_idx"
    ON "live_classes"("tutorId", "status");

CREATE INDEX IF NOT EXISTS "live_classes_status_scheduledAt_idx"
    ON "live_classes"("status", "scheduledAt");

-- Attendance: queried on every roll-call and heartbeat
CREATE INDEX IF NOT EXISTS "attendance_liveClassId_idx"
    ON "attendance"("liveClassId");

CREATE INDEX IF NOT EXISTS "attendance_userId_idx"
    ON "attendance"("userId");

-- Enrolment: queried for access checks on every protected content request
CREATE INDEX IF NOT EXISTS "enrolments_courseId_status_idx"
    ON "enrolments"("courseId", "status");

CREATE INDEX IF NOT EXISTS "enrolments_userId_status_idx"
    ON "enrolments"("userId", "status");

-- Notification: per-user notification feed
CREATE INDEX IF NOT EXISTS "notifications_userId_readAt_idx"
    ON "notifications"("userId", "readAt");

-- AuditLog: written on every significant action
CREATE INDEX IF NOT EXISTS "audit_logs_entityType_entityId_idx"
    ON "audit_logs"("entityType", "entityId");

CREATE INDEX IF NOT EXISTS "audit_logs_actorId_createdAt_idx"
    ON "audit_logs"("actorId", "createdAt" DESC);

-- LessonProgress: checked on every content page load
CREATE INDEX IF NOT EXISTS "lesson_progress_userId_idx"
    ON "lesson_progress"("userId");

-- Sessions: Auth.js session lookup on every request
CREATE INDEX IF NOT EXISTS "sessions_userId_idx"
    ON "sessions"("userId");
