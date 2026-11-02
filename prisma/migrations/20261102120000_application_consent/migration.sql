-- Add data consent timestamp to Application
-- Stores when the applicant ticked the consent checkbox on the apply form.
ALTER TABLE "applications" ADD COLUMN "dataConsentAt" TIMESTAMP(3);
