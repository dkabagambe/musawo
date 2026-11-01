/*
  Warnings:

  - A unique constraint covering the columns `[claimId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[receiptNumber]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ManualPaymentMethod" AS ENUM ('BANK_TRANSFER', 'MOBILE_MONEY_MTN', 'MOBILE_MONEY_AIRTEL', 'CASH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_CLAIM_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_CLAIM_VERIFIED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_CLAIM_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_REVERSED';
ALTER TYPE "AuditAction" ADD VALUE 'STATEMENT_IMPORTED';
ALTER TYPE "AuditAction" ADD VALUE 'RECONCILIATION_ALERT';

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "after" JSONB,
ADD COLUMN     "before" JSONB;

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "accessThresholds" JSONB;

-- AlterTable
ALTER TABLE "enrolments" ADD COLUMN     "paidPercent" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ledger_entries" ADD COLUMN     "receiptNumber" TEXT,
ADD COLUMN     "reversedAt" TIMESTAMP(3),
ADD COLUMN     "reversedByEntryId" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "claimId" TEXT,
ADD COLUMN     "fraudStrike" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "receiptNumber" TEXT,
ADD COLUMN     "reversalReason" TEXT,
ADD COLUMN     "reversedAt" TIMESTAMP(3),
ADD COLUMN     "reversedBy" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "fraudStrikes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "manual_payment_claims" (
    "id" TEXT NOT NULL,
    "enrolmentId" TEXT NOT NULL,
    "claimantId" TEXT NOT NULL,
    "method" "ManualPaymentMethod" NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "payerName" TEXT NOT NULL,
    "payerPhone" TEXT NOT NULL,
    "bankOrProvider" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'SUBMITTED',
    "receiptS3Key" TEXT,
    "receiptSha256" TEXT,
    "receiptPHash" TEXT,
    "receiptExifFlags" JSONB,
    "duplicateImageFlag" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "statementLineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_payment_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statement_imports" (
    "id" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "lineCount" INTEGER NOT NULL,
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "unmatchedCount" INTEGER NOT NULL DEFAULT 0,
    "unclaimedCount" INTEGER NOT NULL DEFAULT 0,
    "s3Key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "statement_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statement_lines" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "txDate" TIMESTAMP(3) NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "amount" INTEGER NOT NULL,
    "matchStatus" TEXT NOT NULL DEFAULT 'UNMATCHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "statement_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manual_payment_claims_transactionId_key" ON "manual_payment_claims"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_claimId_key" ON "payments"("claimId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receiptNumber_key" ON "payments"("receiptNumber");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "manual_payment_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payment_claims" ADD CONSTRAINT "manual_payment_claims_enrolmentId_fkey" FOREIGN KEY ("enrolmentId") REFERENCES "enrolments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payment_claims" ADD CONSTRAINT "manual_payment_claims_claimantId_fkey" FOREIGN KEY ("claimantId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payment_claims" ADD CONSTRAINT "manual_payment_claims_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payment_claims" ADD CONSTRAINT "manual_payment_claims_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payment_claims" ADD CONSTRAINT "manual_payment_claims_statementLineId_fkey" FOREIGN KEY ("statementLineId") REFERENCES "statement_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_imports" ADD CONSTRAINT "statement_imports_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_lines" ADD CONSTRAINT "statement_lines_importId_fkey" FOREIGN KEY ("importId") REFERENCES "statement_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
