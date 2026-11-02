-- Make Application.email optional (some applicants have no email)
ALTER TABLE "applications" ALTER COLUMN "email" DROP NOT NULL;
