-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EnrolmentStatus" ADD VALUE 'PARTIALLY_PAID';
ALTER TYPE "EnrolmentStatus" ADD VALUE 'OVERDUE';
ALTER TYPE "EnrolmentStatus" ADD VALUE 'SPONSORED';
ALTER TYPE "EnrolmentStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "enrolments" ADD COLUMN     "graceUntil" TIMESTAMP(3),
ADD COLUMN     "overdueSince" TIMESTAMP(3),
ADD COLUMN     "provisionalUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "isFreePreview" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "staff_invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_invites_token_key" ON "staff_invites"("token");

-- AddForeignKey
ALTER TABLE "staff_invites" ADD CONSTRAINT "staff_invites_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
