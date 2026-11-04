-- Add per-question timer fields to Exam and ExamAttempt (remarks.md section 2)
ALTER TABLE "exams" ADD COLUMN "perQuestionSec" INTEGER;
ALTER TABLE "exam_attempts" ADD COLUMN "questionDeadlineAt" TIMESTAMP(3);
