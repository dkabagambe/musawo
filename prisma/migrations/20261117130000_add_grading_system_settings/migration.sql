-- CreateTable
CREATE TABLE "grading_system_settings" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "passMarkPercent" INTEGER NOT NULL DEFAULT 60,
    "gradeAMin" INTEGER NOT NULL DEFAULT 80,
    "gradeBMin" INTEGER NOT NULL DEFAULT 70,
    "gradeCMin" INTEGER NOT NULL DEFAULT 60,
    "gradeDMin" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grading_system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grading_system_settings_courseId_key" ON "grading_system_settings"("courseId");

-- AddForeignKey
ALTER TABLE "grading_system_settings" ADD CONSTRAINT "grading_system_settings_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
