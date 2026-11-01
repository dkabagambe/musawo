ALTER TABLE "users"
  ADD COLUMN "professionalTitle" TEXT,
  ADD COLUMN "registrationNumber" TEXT,
  ADD COLUMN "dateOfBirth" TIMESTAMP(3),
  ADD COLUMN "gender" TEXT,
  ADD COLUMN "district" TEXT,
  ADD COLUMN "highestQualification" TEXT,
  ADD COLUMN "idNumberEncrypted" TEXT,
  ADD COLUMN "emergencyContact" TEXT;
