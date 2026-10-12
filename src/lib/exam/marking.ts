import type { QuizQuestion } from "@prisma/client";

type Answers = Record<string, string>; // questionId → answer

interface MarkResult {
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  breakdown: Array<{
    questionId: string;
    correct: boolean | null; // null = needs tutor marking
    points: number;
    awarded: number;
  }>;
  needsTutorReview: boolean;
}

/**
 * Auto-marks MCQ and True/False questions.
 * Short-answer questions are left for tutor review (awarded 0 until reviewed).
 */
export function markExam(
  questions: QuizQuestion[],
  answers: Answers,
  passPercent: number
): MarkResult {
  let score = 0;
  let maxScore = 0;
  let needsTutorReview = false;

  const breakdown = questions.map((q) => {
    maxScore += q.points;
    const given = answers[q.id] ?? "";

    if (q.type === "SHORT_ANSWER") {
      needsTutorReview = true;
      return { questionId: q.id, correct: null, points: q.points, awarded: 0 };
    }

    const correct =
      given.trim().toLowerCase() ===
      (q.correctAnswer ?? "").trim().toLowerCase();

    const awarded = correct ? q.points : 0;
    score += awarded;

    return { questionId: q.id, correct, points: q.points, awarded };
  });

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return {
    score,
    maxScore,
    percentage,
    passed: !needsTutorReview && percentage >= passPercent,
    breakdown,
    needsTutorReview,
  };
}
