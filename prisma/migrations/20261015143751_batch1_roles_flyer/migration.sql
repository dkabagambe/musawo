-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'ADMINISTRATOR';
ALTER TYPE "UserRole" ADD VALUE 'PRINCIPAL';
ALTER TYPE "UserRole" ADD VALUE 'ACADEMIC_REGISTRAR';

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "flyerS3Key" TEXT;
