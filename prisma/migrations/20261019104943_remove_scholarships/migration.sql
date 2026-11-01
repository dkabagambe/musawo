/*
  Warnings:

  - The values [SCHOLARSHIP_AWARD] on the enum `ApprovalRequestType` will be removed. If these variants are still used in the database, this will fail.
  - The values [SPONSORED] on the enum `EnrolmentStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [SCHOLARSHIP] on the enum `LedgerEntryType` will be removed. If these variants are still used in the database, this will fail.
  - The values [SCHOLARSHIP] on the enum `PaymentMethod` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `discountAmountUgx` on the `enrolments` table. All the data in the column will be lost.
  - You are about to drop the column `discountCodeId` on the `enrolments` table. All the data in the column will be lost.
  - You are about to drop the column `scholarshipSeats` on the `intakes` table. All the data in the column will be lost.
  - You are about to drop the `discount_codes` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ApprovalRequestType_new" AS ENUM ('REFUND', 'WAIVER', 'FEE_CHANGE', 'STAFF_ACCOUNT_CREATE', 'STAFF_ACCOUNT_SUSPEND', 'STAFF_ACCOUNT_ROLE_CHANGE');
ALTER TABLE "approval_requests" ALTER COLUMN "type" TYPE "ApprovalRequestType_new" USING ("type"::text::"ApprovalRequestType_new");
ALTER TYPE "ApprovalRequestType" RENAME TO "ApprovalRequestType_old";
ALTER TYPE "ApprovalRequestType_new" RENAME TO "ApprovalRequestType";
DROP TYPE "ApprovalRequestType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "EnrolmentStatus_new" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'PARTIALLY_PAID', 'OVERDUE', 'COMPLETED', 'SUSPENDED', 'REFUNDED', 'CANCELLED');
ALTER TABLE "enrolments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "enrolments" ALTER COLUMN "status" TYPE "EnrolmentStatus_new" USING ("status"::text::"EnrolmentStatus_new");
ALTER TYPE "EnrolmentStatus" RENAME TO "EnrolmentStatus_old";
ALTER TYPE "EnrolmentStatus_new" RENAME TO "EnrolmentStatus";
DROP TYPE "EnrolmentStatus_old";
ALTER TABLE "enrolments" ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "LedgerEntryType_new" AS ENUM ('PAYMENT', 'REFUND', 'ADJUSTMENT');
ALTER TABLE "ledger_entries" ALTER COLUMN "type" TYPE "LedgerEntryType_new" USING ("type"::text::"LedgerEntryType_new");
ALTER TYPE "LedgerEntryType" RENAME TO "LedgerEntryType_old";
ALTER TYPE "LedgerEntryType_new" RENAME TO "LedgerEntryType";
DROP TYPE "LedgerEntryType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethod_new" AS ENUM ('MTN_MOMO', 'AIRTEL_MONEY', 'CARD', 'BANK_TRANSFER', 'MANUAL');
ALTER TABLE "payments" ALTER COLUMN "method" TYPE "PaymentMethod_new" USING ("method"::text::"PaymentMethod_new");
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "PaymentMethod_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "enrolments" DROP CONSTRAINT "enrolments_discountCodeId_fkey";

-- AlterTable
ALTER TABLE "enrolments" DROP COLUMN "discountAmountUgx",
DROP COLUMN "discountCodeId";

-- AlterTable
ALTER TABLE "intakes" DROP COLUMN "scholarshipSeats";

-- DropTable
DROP TABLE "discount_codes";

-- DropEnum
DROP TYPE "DiscountCodeType";
