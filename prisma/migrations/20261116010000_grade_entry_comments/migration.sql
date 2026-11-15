-- Add comments field to GradeEntry for tutor/Principal feedback shown to students
ALTER TABLE "grade_entries" ADD COLUMN IF NOT EXISTS "comments" TEXT;
