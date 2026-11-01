-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';
ALTER TYPE "UserRole" ADD VALUE 'BOARD_MEMBER';
ALTER TYPE "UserRole" ADD VALUE 'DEPUTY_PRINCIPAL';
ALTER TYPE "UserRole" ADD VALUE 'INSTRUCTOR';
ALTER TYPE "UserRole" ADD VALUE 'TEACHING_ASSISTANT';
ALTER TYPE "UserRole" ADD VALUE 'FINANCE_OFFICER';
ALTER TYPE "UserRole" ADD VALUE 'HR_SYSTEM_ADMIN';
ALTER TYPE "UserRole" ADD VALUE 'AUDITOR_READONLY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserStatus" ADD VALUE 'PENDING_ACCEPTANCE';
ALTER TYPE "UserStatus" ADD VALUE 'DETAILS_DISPUTED';

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "contentNote" TEXT,
ADD COLUMN     "durationMonths" INTEGER,
ADD COLUMN     "eligibilityText" TEXT,
ADD COLUMN     "feeContactOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "intakeLabel" TEXT,
ADD COLUMN     "targetAudience" TEXT,
ALTER COLUMN "fullFeeUgx" DROP NOT NULL;

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "courseId" TEXT,
    "intakeId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OPEN',
    "professionalTitle" TEXT,
    "registrationNumber" TEXT,
    "highestQualification" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "district" TEXT,
    "howHeard" TEXT,
    "notes" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "intakes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
