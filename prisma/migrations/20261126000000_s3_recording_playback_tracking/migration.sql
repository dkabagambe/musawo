-- S3: Add recording playback tracking fields
-- Enables resume position, mark as watched, and completion tracking for student recordings

-- AlterTable
ALTER TABLE "attendance" ADD COLUMN "watchedAt" TIMESTAMP(3),
ADD COLUMN "lastPlaybackPosition" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "isWatched" BOOLEAN NOT NULL DEFAULT false;
