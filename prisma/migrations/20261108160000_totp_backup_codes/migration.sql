-- Add TOTP backup codes column to User table
-- Stores 10 hashed single-use backup codes as encrypted JSON
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totpBackupCodes" TEXT;

-- Add new AuditAction enum values (Postgres requires ALTER TYPE ... ADD VALUE)
-- Check and add each value only if it does not already exist to make this idempotent
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'TOTP_RESET' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')) THEN
    ALTER TYPE "AuditAction" ADD VALUE 'TOTP_RESET';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'TOTP_BACKUP_USED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')) THEN
    ALTER TYPE "AuditAction" ADD VALUE 'TOTP_BACKUP_USED';
  END IF;
END
$$;
