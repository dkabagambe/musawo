-- CreateEnum
CREATE TYPE "StudentDocumentType" AS ENUM ('ID_SCAN', 'ACADEMIC_CERT', 'PHOTO', 'MEDICAL', 'OTHER');

-- CreateTable
CREATE TABLE "student_documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "StudentDocumentType" NOT NULL DEFAULT 'OTHER',
    "fileS3Key" TEXT NOT NULL,
    "fileSize" INTEGER,
    "fileName" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "student_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_documents_userId_deletedAt_idx" ON "student_documents"("userId", "deletedAt");

-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT;

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'STUDENT_DOCUMENT_UPLOADED';
ALTER TYPE "AuditAction" ADD VALUE 'STUDENT_DOCUMENT_DELETED';
