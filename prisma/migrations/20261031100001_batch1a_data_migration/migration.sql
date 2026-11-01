-- Batch 1A Part 2: Data migration, schema additions, settings cleanup.
-- Runs after 20261031100000_batch1a_roles_regnumber has committed the new enum values.

-- ─── Step 1: Migrate existing user roles to new model ──────────────────────
-- SUPER_ADMIN, BOARD_MEMBER, SUPERADMIN -> DIRECTOR
UPDATE "users" SET "role" = 'DIRECTOR'
  WHERE "role" IN ('SUPER_ADMIN','BOARD_MEMBER','SUPERADMIN');

-- DEPUTY_PRINCIPAL -> PRINCIPAL
UPDATE "users" SET "role" = 'PRINCIPAL'
  WHERE "role" = 'DEPUTY_PRINCIPAL';

-- ADMINISTRATOR, HR_SYSTEM_ADMIN, FINANCE_OFFICER, REGISTRAR,
-- BURSAR, HR_MANAGER -> ADMIN
UPDATE "users" SET "role" = 'ADMIN'
  WHERE "role" IN ('ADMINISTRATOR','HR_SYSTEM_ADMIN','FINANCE_OFFICER',
                   'REGISTRAR','BURSAR','HR_MANAGER');

-- Old ACADEMIC_REGISTRAR accounts (not the new dummy registrar) -> ADMIN
UPDATE "users" SET "role" = 'ADMIN'
  WHERE "role" = 'ACADEMIC_REGISTRAR'
    AND "email" != 'registrar@mtc.ac.ug';

-- AUDITOR_READONLY, TEACHING_ASSISTANT -> ARCHIVED (suspended, no login)
UPDATE "users" SET "role" = 'ARCHIVED', "status" = 'SUSPENDED'
  WHERE "role" IN ('AUDITOR_READONLY','TEACHING_ASSISTANT');

-- Legacy TUTOR -> INSTRUCTOR
UPDATE "users" SET "role" = 'INSTRUCTOR'
  WHERE "role" = 'TUTOR';

-- Legacy ADMIN alias -> ADMIN (was already HR_MANAGER above, but catch any remaining)
UPDATE "users" SET "role" = 'ADMIN'
  WHERE "role" = 'ADMIN' AND "role" NOT IN ('DIRECTOR','PRINCIPAL','ADMIN',
    'ACADEMIC_REGISTRAR','INSTRUCTOR','STUDENT','SYSTEM_IT','ARCHIVED');

-- SPONSOR, EMPLOYER -> ARCHIVED
UPDATE "users" SET "role" = 'ARCHIVED', "status" = 'SUSPENDED'
  WHERE "role" IN ('SPONSOR','EMPLOYER');

-- ─── Step 2: Add courseCode to courses table ───────────────────────────────
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "courseCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "courses_courseCode_key"
  ON "courses"("courseCode") WHERE "courseCode" IS NOT NULL;

-- Seed the known course codes by slug
UPDATE "courses" SET "courseCode" = 'MHC' WHERE "slug" = 'medical-home-caregiver';
UPDATE "courses" SET "courseCode" = 'BHC' WHERE "slug" = 'basic-home-caregiver';
UPDATE "courses" SET "courseCode" = 'BCS' WHERE "slug" = 'babysitting-childcare-safety';
UPDATE "courses" SET "courseCode" = 'MHA' WHERE "slug" = 'mental-health-support-advocacy';
UPDATE "courses" SET "courseCode" = 'COP' WHERE "slug" = 'care-older-persons-disability';
UPDATE "courses" SET "courseCode" = 'BLS' WHERE "slug" = 'basic-life-support-first-aid';
UPDATE "courses" SET "courseCode" = 'ALS' WHERE "slug" = 'advanced-life-support';
UPDATE "courses" SET "courseCode" = 'AFA' WHERE "slug" = 'advanced-first-aid';

-- ─── Step 3: Create student_number_sequences table ─────────────────────────
CREATE TABLE IF NOT EXISTS "student_number_sequences" (
  "id"         TEXT NOT NULL,
  "courseCode" TEXT NOT NULL,
  "year"       INTEGER NOT NULL,
  "lastSeq"    INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "student_number_sequences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_number_sequences_courseCode_year_key"
    UNIQUE ("courseCode", "year")
);

-- ─── Step 4: Remove legacy student number settings ─────────────────────────
DELETE FROM "site_settings" WHERE "key" IN (
  'student.numberPattern',
  'student.numberPrefix'
);

-- ─── Step 5: Clean up old role label settings ──────────────────────────────
DELETE FROM "site_settings" WHERE "key" IN (
  'role.label.SUPER_ADMIN',
  'role.label.BOARD_MEMBER',
  'role.label.DEPUTY_PRINCIPAL',
  'role.label.TEACHING_ASSISTANT',
  'role.label.FINANCE_OFFICER',
  'role.label.HR_MANAGER',
  'role.label.ADMINISTRATOR',
  'role.label.AUDITOR_READONLY'
);

-- ─── Step 6: Update rbac.roleTree setting ──────────────────────────────────
UPDATE "site_settings"
  SET "value" = '{"DIRECTOR":{"parent":null,"level":1},"PRINCIPAL":{"parent":"DIRECTOR","level":2},"ADMIN":{"parent":"PRINCIPAL","level":3},"INSTRUCTOR":{"parent":"ADMIN","level":4},"STUDENT":{"parent":"INSTRUCTOR","level":5},"ACADEMIC_REGISTRAR":{"parent":null,"level":null},"SYSTEM_IT":{"parent":null,"level":null},"ARCHIVED":{"parent":null,"level":null}}'
  WHERE "key" = 'rbac.roleTree';

-- ─── Note ──────────────────────────────────────────────────────────────────
-- PostgreSQL does not allow removing enum values. The old values remain in
-- the UserRole enum type but no rows use them after the updates above.
-- They are hidden from the UI, permissions, seed and /dev/login.
