-- Clean up UserRole enum: remove all legacy values and keep only the 8 active ones.
-- No rows use the old values (verified by the data migration in 20261031100001).
-- Postgres does not support DROP VALUE on enums, so we recreate the type.

-- Step 1: create the new clean enum type
CREATE TYPE "UserRole_new" AS ENUM (
  'DIRECTOR',
  'PRINCIPAL',
  'ADMIN',
  'ACADEMIC_REGISTRAR',
  'INSTRUCTOR',
  'STUDENT',
  'SYSTEM_IT',
  'ARCHIVED'
);

-- Step 2: alter both columns to use the new type
-- Drop and re-add defaults so they can be cast to the new type
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "UserRole_new"
  USING "role"::text::"UserRole_new";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'STUDENT'::"UserRole_new";

ALTER TABLE "staff_invites"
  ALTER COLUMN "role" TYPE "UserRole_new"
  USING "role"::text::"UserRole_new";

-- Step 3: drop the old enum
DROP TYPE "UserRole";

-- Step 4: rename the new enum to the canonical name
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
