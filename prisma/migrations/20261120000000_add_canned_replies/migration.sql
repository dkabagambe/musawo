-- CreateTable
CREATE TABLE "canned_replies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canned_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "canned_replies_active_category_idx" ON "canned_replies"("active", "category");
