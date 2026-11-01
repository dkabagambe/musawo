-- ExamSession forward-only: track the current question and the per-attempt question order
-- so the server can reject answers to earlier questions.
ALTER TABLE "exam_attempts" ADD COLUMN "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "exam_attempts" ADD COLUMN "questionOrder" JSONB;

-- Live class speak rights: a single three-state status per student per live class
-- (LISTEN_ONLY, REQUESTED, CAN_SPEAK), granted and revoked by the instructor.
CREATE TYPE "SpeakStatus" AS ENUM ('LISTEN_ONLY', 'REQUESTED', 'CAN_SPEAK');
ALTER TABLE "attendance" ADD COLUMN "speakStatus" "SpeakStatus" NOT NULL DEFAULT 'LISTEN_ONLY';

-- Backfill speakStatus from the legacy canSpeak / handRaisedAt fields.
UPDATE "attendance" SET "speakStatus" = 'CAN_SPEAK' WHERE "canSpeak" = TRUE;
UPDATE "attendance" SET "speakStatus" = 'REQUESTED' WHERE "handRaisedAt" IS NOT NULL AND "canSpeak" = FALSE;
