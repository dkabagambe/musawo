-- T1: Profile & Avatar
-- Add bio and themePreference to users, create user_avatars table.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "bio"             TEXT,
  ADD COLUMN IF NOT EXISTS "themePreference" TEXT NOT NULL DEFAULT 'system';

CREATE TABLE IF NOT EXISTS "user_avatars" (
  "userId"      TEXT        NOT NULL PRIMARY KEY,
  "contentType" TEXT        NOT NULL DEFAULT 'image/webp',
  "bytes"       BYTEA       NOT NULL,
  "thumbBytes"  BYTEA       NOT NULL,
  "sizeBytes"   INTEGER     NOT NULL,
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "user_avatars_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
