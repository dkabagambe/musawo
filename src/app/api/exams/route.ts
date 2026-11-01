import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { markExam } from "@/lib/exam/marking";
import { audit } from "@/lib/audit";
import { getTabSwitchThreshold } from "@/lib/settings";
import { z } from "zod";

// Forward-only exam submission schemas.
// "answer" commits a single question and advances the server-side pointer; the
// server rejects answers to earlier (already-closed) questions. "submit"
// finalises the attempt using the answers already committed on the attempt.
const AnswerSchema = z.object({
  attemptId: z.string().cuid(),
  questionId: z.string().cuid(),
  answer: z.string(),
  index: z.number().int().nonnegative(),
});

const SubmitSchema = z.object({
  attemptId: z.string().cuid(),
});

// POST /api/exams?action=start|answer|submit|tab-switch
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "start") {
    return handleStart(req, session.user.id);
  }
  if (action === "answer") {
    return handleAnswer(req, session.user.id);
  }
  if (action === "submit") {
    return handleSubmit(req, session.user.id);
  }
  if (action === "tab-switch") {
    return handleTabSwitch(req, session.user.id);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// Rebuild the question list for a stored per-attempt order (used when resuming).
async function questionsForOrder(order: string[] | null) {
  if (!order || order.length === 0) return [];
  const rows = await db.quizQuestion.findMany({ where: { id: { in: order } } });
  const byId = new Map(rows.map((q) => [q.id, q]));
  return order
    .map((id) => byId.get(id))
    .filter((q): q is NonNullable<typeof q> => Boolean(q))
    .map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      options: q.options,
      points: q.points,
    }));
}

async function handleStart(req: NextRequest, userId: string) {
  const { examId } = (await req.json()) as { examId: string };

  const exam = await db.exam.findUnique({
    where: { id: examId, status: "PUBLISHED" },
    include: { questions: true },
  });
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

  // Check enrolment
  const enrolment = await db.enrolment.findFirst({
    where: {
      userId,
      courseId: exam.courseId,
      status: "ACTIVE",
    },
  });
  if (!enrolment) {
    return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
  }

  // Resume an in-progress (forward-only) attempt if one already exists.
  const activeAttempt = await db.examAttempt.findFirst({
    where: { examId, userId, status: "IN_PROGRESS" },
  });
  if (activeAttempt) {
    const resumed = await questionsForOrder(
      activeAttempt.questionOrder as string[] | null,
    );
    return NextResponse.json({
      attemptId: activeAttempt.id,
      timeLimitEndsAt: activeAttempt.timeLimitEndsAt,
      questions: resumed,
      currentQuestionIndex: activeAttempt.currentQuestionIndex,
      resumed: true,
    });
  }

  // Check attempt limit
  const attemptCount = await db.examAttempt.count({
    where: { examId, userId },
  });
  if (attemptCount >= exam.attemptLimit) {
    return NextResponse.json({ error: "Attempt limit reached" }, { status: 403 });
  }

  const timeLimitEndsAt = exam.timeLimitMin
    ? new Date(Date.now() + exam.timeLimitMin * 60 * 1000)
    : null;

  // Build the question list (shuffled if enabled) and lock the order on the
  // attempt so the server can enforce forward-only answering.
  let questions = exam.questions.map((q) => ({
    id: q.id,
    text: q.text,
    type: q.type,
    options: q.options,
    points: q.points,
  }));

  if (exam.shuffleQuestions) {
    questions = questions.sort(() => Math.random() - 0.5);
  }
  const questionOrder = questions.map((q) => q.id);

  const attempt = await db.examAttempt.create({
    data: {
      examId,
      userId,
      number: attemptCount + 1,
      status: "IN_PROGRESS",
      timeLimitEndsAt,
      answers: {},
      currentQuestionIndex: 0,
      questionOrder,
    },
  });

  await audit({
    actorId: userId,
    action: "EXAM_STARTED",
    entityType: "ExamAttempt",
    entityId: attempt.id,
    metadata: { examId },
  });

  return NextResponse.json({
    attemptId: attempt.id,
    timeLimitEndsAt,
    questions,
    currentQuestionIndex: 0,
  });
}

async function handleAnswer(req: NextRequest, userId: string) {
  let body: z.infer<typeof AnswerSchema>;
  try {
    body = AnswerSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid input", details: err }, { status: 400 });
  }

  const attempt = await db.examAttempt.findUnique({ where: { id: body.attemptId } });
  if (!attempt || attempt.userId !== userId) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Attempt already submitted" }, { status: 409 });
  }

  const order = attempt.questionOrder as string[] | null;
  if (!order) {
    return NextResponse.json({ error: "This attempt is not forward-only." }, { status: 409 });
  }
  if (body.index < 0 || body.index >= order.length) {
    return NextResponse.json({ error: "Invalid question index" }, { status: 400 });
  }
  if (order[body.index] !== body.questionId) {
    return NextResponse.json({ error: "Question does not match this position" }, { status: 400 });
  }
  // Forward-only: an earlier question that has already been left cannot be reopened.
  if (body.index < attempt.currentQuestionIndex) {
    return NextResponse.json(
      { error: "This question has already been closed and cannot be reopened." },
      { status: 409 },
    );
  }
  // Cannot jump ahead of the current question.
  if (body.index > attempt.currentQuestionIndex) {
    return NextResponse.json(
      { error: "Answer the current question before moving on." },
      { status: 409 },
    );
  }

  const existing = (attempt.answers as Record<string, string> | null) ?? {};
  const answers = { ...existing, [body.questionId]: body.answer };
  const nextIndex = body.index + 1;

  await db.examAttempt.update({
    where: { id: attempt.id },
    data: { answers, currentQuestionIndex: nextIndex },
  });

  return NextResponse.json({
    ok: true,
    currentQuestionIndex: nextIndex,
    finished: nextIndex >= order.length,
  });
}

async function handleSubmit(req: NextRequest, userId: string) {
  let body: z.infer<typeof SubmitSchema>;
  try {
    body = SubmitSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid input", details: err }, { status: 400 });
  }

  const attempt = await db.examAttempt.findUnique({
    where: { id: body.attemptId },
    include: {
      exam: { include: { questions: true } },
    },
  });

  if (!attempt || attempt.userId !== userId) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Attempt already submitted" }, { status: 409 });
  }

  // Mark from the answers committed server-side during the forward-only flow.
  const answers = (attempt.answers as Record<string, string> | null) ?? {};
  const result = markExam(attempt.exam.questions, answers, attempt.exam.passPercent);

  const newStatus = result.needsTutorReview ? "SUBMITTED" : "MARKED";

  await db.examAttempt.update({
    where: { id: attempt.id },
    data: {
      status: newStatus,
      submittedAt: new Date(),
      answers,
      score: result.score,
      maxScore: result.maxScore,
      passed: result.needsTutorReview ? null : result.passed,
    },
  });

  await audit({
    actorId: userId,
    action: "EXAM_SUBMITTED",
    entityType: "ExamAttempt",
    entityId: attempt.id,
    metadata: { score: result.score, passed: result.passed },
  });

  return NextResponse.json({
    score: result.score,
    maxScore: result.maxScore,
    percentage: result.percentage,
    passed: result.passed,
    needsTutorReview: result.needsTutorReview,
    breakdown: result.breakdown,
  });
}

async function handleTabSwitch(req: NextRequest, userId: string) {
  const { attemptId } = (await req.json()) as { attemptId: string };

  const attempt = await db.examAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== userId || attempt.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Invalid attempt" }, { status: 400 });
  }

  const updated = await db.examAttempt.update({
    where: { id: attemptId },
    data: { tabSwitches: { increment: 1 } },
  });

  const threshold = await getTabSwitchThreshold();
  if (updated.tabSwitches >= threshold) {
    // TODO: send notification to tutor
    console.warn(`Tab switch threshold reached for attempt ${attemptId}`);
  }

  return NextResponse.json({ tabSwitches: updated.tabSwitches });
}
