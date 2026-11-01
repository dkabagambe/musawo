-- Migration: Breakaway groups, group work submissions, class-scoped forum threads
-- Section 9 of remarks.md

-- ─────────────────────────────────────────────
-- ClassGroup: per-live-class breakaway groups
-- ─────────────────────────────────────────────
CREATE TABLE "class_groups" (
    "id"          TEXT NOT NULL,
    "liveClassId" TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "meetLink"    TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "class_groups_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "class_groups_liveClassId_idx" ON "class_groups"("liveClassId");

ALTER TABLE "class_groups"
    ADD CONSTRAINT "class_groups_liveClassId_fkey"
    FOREIGN KEY ("liveClassId") REFERENCES "live_classes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────
-- ClassGroupMember: students assigned to groups
-- ─────────────────────────────────────────────
CREATE TABLE "class_group_members" (
    "id"        TEXT NOT NULL,
    "groupId"   TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "class_group_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "class_group_members_groupId_userId_key" ON "class_group_members"("groupId", "userId");
CREATE INDEX "class_group_members_groupId_idx" ON "class_group_members"("groupId");
CREATE INDEX "class_group_members_userId_idx" ON "class_group_members"("userId");

ALTER TABLE "class_group_members"
    ADD CONSTRAINT "class_group_members_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "class_groups"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "class_group_members"
    ADD CONSTRAINT "class_group_members_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────
-- GroupWorkSubmission: one per group per class
-- ─────────────────────────────────────────────
CREATE TABLE "group_work_submissions" (
    "id"             TEXT NOT NULL,
    "groupId"        TEXT NOT NULL,
    "liveClassId"    TEXT NOT NULL,
    "title"          TEXT NOT NULL,
    "body"           TEXT,
    "fileS3Key"      TEXT,
    "submittedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "groupMark"      INTEGER,
    "individualMarks" JSONB,
    "gradedAt"       TIMESTAMP(3),
    "gradedBy"       TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "group_work_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "group_work_submissions_groupId_liveClassId_key"
    ON "group_work_submissions"("groupId", "liveClassId");
CREATE INDEX "group_work_submissions_liveClassId_idx" ON "group_work_submissions"("liveClassId");

ALTER TABLE "group_work_submissions"
    ADD CONSTRAINT "group_work_submissions_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "class_groups"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "group_work_submissions"
    ADD CONSTRAINT "group_work_submissions_gradedBy_fkey"
    FOREIGN KEY ("gradedBy") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────
-- Extend ForumThread with class and group scoping
-- ─────────────────────────────────────────────
ALTER TABLE "forum_threads"
    ADD COLUMN "liveClassId" TEXT,
    ADD COLUMN "groupId"     TEXT;

CREATE INDEX "forum_threads_courseId_idx" ON "forum_threads"("courseId");
CREATE INDEX "forum_threads_liveClassId_idx" ON "forum_threads"("liveClassId");
CREATE INDEX "forum_threads_groupId_idx" ON "forum_threads"("groupId");

ALTER TABLE "forum_threads"
    ADD CONSTRAINT "forum_threads_liveClassId_fkey"
    FOREIGN KEY ("liveClassId") REFERENCES "live_classes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
