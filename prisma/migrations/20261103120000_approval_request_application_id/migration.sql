-- AlterTable: add applicationId to approval_requests for ADMISSION side-effects
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "applicationId" TEXT;
