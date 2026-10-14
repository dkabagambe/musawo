import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { markExam } from "@/lib/exam/marking";
import { audit } from "@/lib/audit";
import { getTabSwitchThreshold } from "@/lib/settings";
import { SubmitExamSchema } from "@/lib/validators";
import { z } from "zod";

// POST /api/exams/start - start an exam attempt
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
  if (action === "submit") {
    return handleSubmit(req, session.user.id);
  }
  if (action === "tab-switch") {
    return handleTabSwitch(req, session.user.id);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
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

  // Check attempt limit
  const attemptCount = await db.examAttempt.count({
    where: { examId, userId },
  });
  if (attemptCount >= exam.attemptLimit) {
    return NextResponse.json({ error: "Attempt limit reached" }, { status: 403 });
  }

  // Check no active attempt
  const activeAttempt = await db.examAttempt.findFirst({
    where: { examId, userId, status: "IN_PROGRESS" },
  });
  if (activeAttempt) {
    return NextResponse.json({ attemptId: activeAttempt.id, status: "existing" });
  }

  const timeLimitEndsAt = exam.timeLimitMin
    ? new Date(Date.now() + exam.timeLimitMin * 60 * 1000)
    : null;

  const attempt = await db.examAttempt.create({
    data: {
      examId,
      userId,
      number: attemptCount + 1,
      status: "IN_PROGRESS",
      timeLimitEndsAt,
      answers: {},
    },
  });

  await audit({
    actorId: userId,
    action: "EXAM_STARTED",
    entityType: "ExamAttempt",
    entityId: attempt.id,
    metadata: { examId },
  });

  // Return questions (shuffled if needed)
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

  return NextResponse.json({
    attemptId: attempt.id,
    timeLimitEndsAt,
    questions,
  });
}

async function handleSubmit(req: NextRequest, userId: string) {
  let body: z.infer<typeof SubmitExamSchema>;
  try {
    body = SubmitExamSchema.parse(await req.json());
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

  // Check time limit
  if (attempt.timeLimitEndsAt && attempt.timeLimitEndsAt < new Date()) {
    // Time up - submit with whatever answers they have
  }

  const result = markExam(
    attempt.exam.questions,
    body.answers,
    attempt.exam.passPercent
  );

  const newStatus = result.needsTutorReview ? "SUBMITTED" : "MARKED";

  await db.examAttempt.update({
    where: { id: attempt.id },
    data: {
      status: newStatus,
      submittedAt: new Date(),
      answers: body.answers,
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
