-- Add missing columns to announcements table
ALTER TABLE "announcements"
  ADD COLUMN IF NOT EXISTS "audienceType" TEXT DEFAULT 'ALL',
  ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'PUBLISHED',
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "targetIntakeId" TEXT,
  ADD COLUMN IF NOT EXISTS "createdById" TEXT,
  ADD COLUMN IF NOT EXISTS "liveClassId" TEXT;

-- Add foreign key for liveClassId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT constraint_name FROM information_schema.table_constraints 
    WHERE table_name = 'announcements' AND constraint_name = 'announcements_liveClassId_fkey'
  ) THEN
    ALTER TABLE "announcements"
      ADD CONSTRAINT "announcements_liveClassId_fkey"
      FOREIGN KEY ("liveClassId") REFERENCES "live_classes"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT constraint_name FROM information_schema.table_constraints 
    WHERE table_name = 'announcements' AND constraint_name = 'announcements_targetIntakeId_fkey'
  ) THEN
    ALTER TABLE "announcements"
      ADD CONSTRAINT "announcements_targetIntakeId_fkey"
      FOREIGN KEY ("targetIntakeId") REFERENCES "intakes"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT constraint_name FROM information_schema.table_constraints 
    WHERE table_name = 'announcements' AND constraint_name = 'announcements_createdById_fkey'
  ) THEN
    ALTER TABLE "announcements"
      ADD CONSTRAINT "announcements_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
