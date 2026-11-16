-- S8 performance indexes: eliminate N+1 patterns on the highest-traffic student queries.

-- grade_entries: student results list (by user and course)
CREATE INDEX IF NOT EXISTS "grade_entries_userId_courseId_idx"
  ON "grade_entries" ("userId", "courseId");

CREATE INDEX IF NOT EXISTS "grade_entries_userId_releasedAt_idx"
  ON "grade_entries" ("userId", "releasedAt");

-- assignments: list by course and status (student materials page, dashboard widget)
CREATE INDEX IF NOT EXISTS "assignments_courseId_status_idx"
  ON "assignments" ("courseId", "status");

CREATE INDEX IF NOT EXISTS "assignments_dueDate_idx"
  ON "assignments" ("dueDate");

-- assignment_submissions: student's own submission history
CREATE INDEX IF NOT EXISTS "assignment_submissions_userId_submittedAt_idx"
  ON "assignment_submissions" ("userId", "submittedAt");

CREATE INDEX IF NOT EXISTS "assignment_submissions_assignmentId_status_idx"
  ON "assignment_submissions" ("assignmentId", "status");

-- forum_replies: thread reply list (ordered by time)
CREATE INDEX IF NOT EXISTS "forum_replies_threadId_createdAt_idx"
  ON "forum_replies" ("threadId", "createdAt");

CREATE INDEX IF NOT EXISTS "forum_replies_authorId_idx"
  ON "forum_replies" ("authorId");

-- announcements: student inbox (by course + created date, pinned first)
CREATE INDEX IF NOT EXISTS "announcements_courseId_createdAt_idx"
  ON "announcements" ("courseId", "createdAt");

CREATE INDEX IF NOT EXISTS "announcements_pinned_createdAt_idx"
  ON "announcements" ("pinned", "createdAt");
