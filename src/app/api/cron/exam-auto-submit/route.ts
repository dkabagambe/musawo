import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { markExam } from "@/lib/exam/marking";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * POST /api/cron/exam-auto-submit
 *
 * Server-side exam clock enforcement (section 11).
 * Finds every IN_PROGRESS attempt whose timeLimitEndsAt has passed
 * and finalises it using the answers already committed server-side.
 *
 * The partial index exam_attempts_timeLimitEndsAt_status_idx
 * (WHERE status = 'IN_PROGRESS' AND timeLimitEndsAt IS NOT NULL)
 * makes this scan efficient even at 400 concurrent exam sessions.
 *
 * Run every 30 seconds from a scheduler (cron or render.com cron jobs):
 *   Authorization: Bearer $CRON_SECRET
 *
 * SKIP LOCKED ensures two overlapping runs never double-submit the same attempt.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    req.headers.get("authorization") !== `Bearer ${secret}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Grab up to 100 timed-out in-progress attempts, skipping any locked by a
  // concurrent cron run. The partial index keeps this query fast.
  type TimedOut = {
    id: string;
    userId: string;
    examId: string;
    answers: Record<string, string> | null;
    questionOrder: string[] | null;
  };
  const timedOut = await db.$queryRaw<TimedOut[]>`
    SELECT
      id,
      "userId",
      "examId",
      answers,
      "questionOrder"
    FROM exam_attempts
    WHERE status = 'IN_PROGRESS'
      AND "timeLimitEndsAt" IS NOT NULL
      AND "timeLimitEndsAt" <= NOW()
    ORDER BY "timeLimitEndsAt"
    LIMIT 100
    FOR UPDATE SKIP LOCKED
  `;

  if (timedOut.length === 0) {
    return NextResponse.json({ autoSubmitted: 0 });
  }

  // Load the relevant exams once (avoid N+1).
  const examIds = [...Array.from(new Set(timedOut.map((a) => a.examId)))];
  const exams = await db.exam.findMany({
    where: { id: { in: examIds } },
    include: { questions: true },
  });
  const examMap = new Map(exams.map((e) => [e.id, e]));

  let autoSubmitted = 0;
  const errors: Array<{ attemptId: string; error: string }> = [];

  for (const attempt of timedOut) {
    try {
      const exam = examMap.get(attempt.examId);
      if (!exam) {
        errors.push({ attemptId: attempt.id, error: "Exam not found" });
        continue;
      }

      const answers =
        (attempt.answers as Record<string, string> | null) ?? {};
      const result = markExam(exam.questions, answers, exam.passPercent);
      const newStatus = result.needsTutorReview ? "SUBMITTED" : "MARKED";

      await db.examAttempt.update({
        where: { id: attempt.id },
        data: {
          status: newStatus,
          submittedAt: new Date(),
          score: result.score,
          maxScore: result.maxScore,
          passed: result.needsTutorReview ? null : result.passed,
          // answers are already committed server-side; no change needed
        },
      });

      await audit({
        actorId: attempt.userId,
        action: "EXAM_SUBMITTED",
        entityType: "ExamAttempt",
        entityId: attempt.id,
        metadata: {
          examId: attempt.examId,
          score: result.score,
          timedOut: true,
          autoSubmitted: true,
        },
      });

      autoSubmitted++;
    } catch (err) {
      errors.push({
        attemptId: attempt.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    autoSubmitted,
    errors: errors.length > 0 ? errors : undefined,
  });
}
