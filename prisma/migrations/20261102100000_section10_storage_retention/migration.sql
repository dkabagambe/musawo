-- Section 10: Storage and Retention
-- Adds: sizeBytes on lessons, StorageCleanupJob model,
--       STORAGE_CLEAR approval type, storage audit actions,
--       and the default site-setting for trash retention days.

-- 1. Track uploaded file size on lessons (notes S3 files)
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "sizeBytes" INTEGER;

-- 2. New approval request type: STORAGE_CLEARING (already added in 20261031120000;
--    this block is a no-op but kept for documentation clarity)
-- (No DDL change needed: STORAGE_CLEARING was added in migration 20261031120000)

-- 3. New audit actions for storage events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'STORAGE_SCAN'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
  ) THEN
    ALTER TYPE "AuditAction" ADD VALUE 'STORAGE_SCAN';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'STORAGE_PURGE_REQUESTED'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
  ) THEN
    ALTER TYPE "AuditAction" ADD VALUE 'STORAGE_PURGE_REQUESTED';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'STORAGE_PURGE_CONFIRMED'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
  ) THEN
    ALTER TYPE "AuditAction" ADD VALUE 'STORAGE_PURGE_CONFIRMED';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'STORAGE_PURGE_EXECUTED'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
  ) THEN
    ALTER TYPE "AuditAction" ADD VALUE 'STORAGE_PURGE_EXECUTED';
  END IF;
END
$$;

-- 4. StorageCleanupJob table
CREATE TABLE IF NOT EXISTS "storage_cleanup_jobs" (
    "id"                TEXT NOT NULL,
    "intakeId"          TEXT,
    "intakeLabel"       TEXT NOT NULL,
    "status"            TEXT NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    -- PENDING_CONFIRMATION | CONFIRMED | IN_TRASH | EXECUTED | CANCELLED
    "itemsJson"         JSONB NOT NULL DEFAULT '[]',
    -- [{type, id, s3Key|recordingUrl, fileName, sizeBytes, courseTitle, intakeLabel}]
    "totalSizeBytes"    BIGINT NOT NULL DEFAULT 0,
    "trashDays"         INTEGER NOT NULL DEFAULT 14,
    "confirmedBy"       TEXT,
    "confirmedAt"       TIMESTAMP(3),
    "executeAfter"      TIMESTAMP(3),
    "executedAt"        TIMESTAMP(3),
    "cancelledAt"       TIMESTAMP(3),
    "exportUrl"         TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "storage_cleanup_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "storage_cleanup_jobs_status_idx"
    ON "storage_cleanup_jobs"("status");

CREATE INDEX IF NOT EXISTS "storage_cleanup_jobs_executeAfter_idx"
    ON "storage_cleanup_jobs"("executeAfter");

-- 5. Seed default site settings for storage
INSERT INTO "site_settings" ("id", "key", "value", "description", "updatedAt")
VALUES
    (gen_random_uuid()::text,
     'storage.trash_retention_days',
     '14',
     'Days a file sits in trash before permanent deletion when a storage clear is confirmed',
     NOW()),
    (gen_random_uuid()::text,
     'storage.warning_percent',
     '80',
     'Storage usage percentage at which a warning is shown to Principal and Director',
     NOW()),
    (gen_random_uuid()::text,
     'storage.total_gb',
     '50',
     'Total platform storage quota in gigabytes (update when your plan changes)',
     NOW())
ON CONFLICT ("key") DO NOTHING;
