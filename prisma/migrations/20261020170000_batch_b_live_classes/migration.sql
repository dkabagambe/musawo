CREATE TYPE "AttendanceMark" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'EXCUSED');
ALTER TABLE "live_classes"
  ADD COLUMN "providerMeetingId" TEXT,
  ADD COLUMN "recordingEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "recordingStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "studentsMaySpeak" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "selfCheckInOpensAt" TIMESTAMP(3),
  ADD COLUMN "selfCheckInClosesAt" TIMESTAMP(3),
  ADD COLUMN "minimumAttendancePercent" INTEGER NOT NULL DEFAULT 75;
ALTER TABLE "attendance"
  ADD COLUMN "startMark" "AttendanceMark",
  ADD COLUMN "endMark" "AttendanceMark",
  ADD COLUMN "startComment" TEXT,
  ADD COLUMN "endComment" TEXT,
  ADD COLUMN "selfCheckedInAt" TIMESTAMP(3),
  ADD COLUMN "handRaisedAt" TIMESTAMP(3),
  ADD COLUMN "canSpeak" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isMuted" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "isPresenter" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "platform_presence" (
  "userId" TEXT NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currentClassId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_presence_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "platform_presence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "platform_presence_lastSeenAt_idx" ON "platform_presence"("lastSeenAt");
CREATE INDEX "attendance_liveClassId_startMark_idx" ON "attendance"("liveClassId", "startMark");
CREATE INDEX "live_classes_status_scheduledAt_idx" ON "live_classes"("status", "scheduledAt");
ALTER TABLE "live_classes" ALTER COLUMN "platform" SET DEFAULT 'link';
ALTER TABLE "courses" ADD COLUMN "minimumAttendancePercent" INTEGER NOT NULL DEFAULT 75;
CREATE TABLE "live_class_reminders" (
  "id" TEXT NOT NULL,
  "liveClassId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "remindAt" TIMESTAMP(3) NOT NULL,
  "processingAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "live_class_reminders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "live_class_reminders_liveClassId_fkey" FOREIGN KEY ("liveClassId") REFERENCES "live_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "live_class_reminders_unique" UNIQUE ("liveClassId", "channel", "remindAt")
);
CREATE INDEX "live_class_reminders_due_idx" ON "live_class_reminders"("remindAt", "sentAt");
