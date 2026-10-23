-- Performance indexes for frequently queried fields

-- AuditLog: filter by actor and sort by date
CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actorId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("createdAt" DESC);

-- Enrolment: filter by userId and status
CREATE INDEX IF NOT EXISTS "enrolments_user_id_status_idx" ON "enrolments"("userId", "status");
CREATE INDEX IF NOT EXISTS "enrolments_course_id_status_idx" ON "enrolments"("courseId", "status");

-- Payment: filter by enrolment
CREATE INDEX IF NOT EXISTS "payments_enrolment_id_created_at_idx" ON "payments"("enrolmentId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments"("status");

-- LiveClass: filter by courseId and date
CREATE INDEX IF NOT EXISTS "live_classes_course_id_scheduled_at_idx" ON "live_classes"("courseId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "live_classes_status_scheduled_at_idx" ON "live_classes"("status", "scheduledAt");

-- ExamAttempt: filter by userId and status
CREATE INDEX IF NOT EXISTS "exam_attempts_user_id_status_idx" ON "exam_attempts"("userId", "status");
CREATE INDEX IF NOT EXISTS "exam_attempts_exam_id_status_idx" ON "exam_attempts"("examId", "status");

-- Notification: filter unread by user
CREATE INDEX IF NOT EXISTS "notifications_user_id_read_at_idx" ON "notifications"("userId", "readAt");
CREATE INDEX IF NOT EXISTS "notifications_user_id_created_at_idx" ON "notifications"("userId", "createdAt" DESC);

-- Application: filter by status
CREATE INDEX IF NOT EXISTS "applications_status_created_at_idx" ON "applications"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "applications_email_idx" ON "applications"("email");

-- ApprovalRequest: filter by status and initiator
CREATE INDEX IF NOT EXISTS "approval_requests_status_idx" ON "approval_requests"("status");
CREATE INDEX IF NOT EXISTS "approval_requests_initiator_id_status_idx" ON "approval_requests"("initiatorId", "status");

-- SupportTicket: filter by status, user, assignee
CREATE INDEX IF NOT EXISTS "support_tickets_user_id_status_idx" ON "support_tickets"("userId", "status");
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets"("status");
CREATE INDEX IF NOT EXISTS "support_tickets_assigned_to_idx" ON "support_tickets"("assignedTo");

-- User: filter students by role and status
CREATE INDEX IF NOT EXISTS "users_role_status_idx" ON "users"("role", "status");

-- LessonProgress: filter by userId
CREATE INDEX IF NOT EXISTS "lesson_progress_user_id_idx" ON "lesson_progress"("userId");

-- Attendance: filter by liveClassId
CREATE INDEX IF NOT EXISTS "attendance_live_class_id_idx" ON "attendance"("liveClassId");
CREATE INDEX IF NOT EXISTS "attendance_user_id_idx" ON "attendance"("userId");

-- GradeEntry: filter by userId and courseId
CREATE INDEX IF NOT EXISTS "grade_entries_user_id_course_id_idx" ON "grade_entries"("userId", "courseId");
