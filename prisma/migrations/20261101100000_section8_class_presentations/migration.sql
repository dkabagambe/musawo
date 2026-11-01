-- CreateTable: class_presentations
-- Stores slides/PDF files uploaded by the instructor for a live class.
-- Students see these in-platform only; no download is ever served.

CREATE TABLE "class_presentations" (
    "id"          TEXT NOT NULL,
    "liveClassId" TEXT NOT NULL,
    "uploadedBy"  TEXT NOT NULL,
    "fileName"    TEXT NOT NULL,
    "s3Key"       TEXT NOT NULL,
    "mimeType"    TEXT NOT NULL DEFAULT 'application/pdf',
    "sizeBytes"   INTEGER NOT NULL,
    "order"       INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_presentations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "class_presentations" ADD CONSTRAINT "class_presentations_liveClassId_fkey"
    FOREIGN KEY ("liveClassId") REFERENCES "live_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "class_presentations" ADD CONSTRAINT "class_presentations_uploadedBy_fkey"
    FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "class_presentations_liveClassId_idx" ON "class_presentations"("liveClassId");
