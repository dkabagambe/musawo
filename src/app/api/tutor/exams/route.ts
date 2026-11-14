/**
 * GET  /api/tutor/exams          - list exams for tutor's courses
 * POST /api/tutor/exams          - create exam with questions
 * PATCH /api/tutor/exams         - update exam (edit, publish, archive)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can, ForbiddenError, requirePermission } from "@/lib/rbac";
import { teachingCourseWhere, canAccessTeachingCourse } from "@/lib/teaching/scope";
import { z } from "zod";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const QuestionSchema = z.object({
  text: z.string().min(1).max(2000),
  type: z.enum(["MCQ", "TRUE_FALSE", "SHORT_ANSWER"]),
  points: z.number().int().min(1).max(100).default(1),
  options: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  correctAnswer: z.string().optional(),
  explanation: z.string().max(1000).optional(),
});

const CreateExamSchema = z.object({
  courseId: z.string().cuid(),
  blockId: z.string().cuid().optional(),
  title: z.string().min(3).max(300),
  instructions: z.string().max(5000).optional(),
  timeLimitMin: z.number().int().min(1).max(480).optional(),
  perQuestionSec: z.number().int().min(10).max(600).optional(),
  attemptLimit: z.number().int().min(1).max(10).default(2),
  passPercent: z.number().int().min(1).max(100).default(60),
  shuffleQuestions: z.boolean().default(true),
  startWindowAt: z.string().datetime().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  questions: z.array(QuestionSchema).min(1).max(100),
});

const PatchExamSchema = z.object({
  examId: z.string().cuid(),
  action: z.enum(["publish", "archive", "edit"]),
  title: z.string().min(3).max(300).optional(),
  instructions: z.string().max(5000).optional(),
  timeLimitMin: z.number().int().min(1).max(480).nullable().optional(),
  passPercent: z.number().int().min(1).max(100).optional(),
  shuffleQuestions: z.boolean().optional(),
  startWindowAt: z.string().datetime().nullable().optional(),
});

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "exams.mark") && !can(session.user.role, "exams.create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const exams = await db.exam.findMany({
    where: { course: teachingCourseWhere(session.user.id) },
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { id: true, title: true } },
      block: { select: { id: true, title: true, order: true } },
      _count: { select: { questions: true, attempts: true } },
    },
  });

  return NextResponse.json({ exams });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "exams.create"); }
  catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }

  const parsed = CreateExamSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid exam data", details: parsed.error.flatten() }, { status: 400 });
  }

  const { courseId, blockId, title, instructions, timeLimitMin, perQuestionSec,
    attemptLimit, passPercent, shuffleQuestions, startWindowAt, status, questions } = parsed.data;

  if (!await canAccessTeachingCourse(courseId, session.user.id)) {
    return NextResponse.json({ error: "You are not assigned to this course." }, { status: 403 });
  }

  if (blockId) {
    const block = await db.block.findFirst({ where: { id: blockId, courseId }, select: { id: true } });
    if (!block) return NextResponse.json({ error: "Block not found in this course." }, { status: 400 });
  }

  // Validate MCQ questions have correct answer
  for (const q of questions) {
    if (q.type === "MCQ" && (!q.options?.length || !q.correctAnswer)) {
      return NextResponse.json({
        error: `MCQ question "${q.text.slice(0, 40)}" needs options and a correct answer.`
      }, { status: 400 });
    }
    if (q.type === "TRUE_FALSE" && !q.correctAnswer) {
      return NextResponse.json({ error: `True/false question needs a correct answer (true or false).` }, { status: 400 });
    }
  }

  const exam = await db.$transaction(async (tx) => {
    const created = await tx.exam.create({
      data: {
        courseId,
        blockId: blockId ?? null,
        title,
        instructions: instructions ?? null,
        timeLimitMin: timeLimitMin ?? null,
        perQuestionSec: perQuestionSec ?? null,
        attemptLimit,
        passPercent,
        shuffleQuestions,
        startWindowAt: startWindowAt ? new Date(startWindowAt) : null,
        status,
      },
    });

    await tx.quizQuestion.createMany({
      data: questions.map((q) => ({
        examId: created.id,
        text: q.text,
        type: q.type,
        points: q.points,
        options: q.options ?? undefined,
        correctAnswer: q.correctAnswer ?? null,
        explanation: q.explanation ?? null,
      })),
    });

    return created;
  });

  await audit({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "Exam",
    entityId: exam.id,
    metadata: { courseId, questionCount: questions.length, status },
  });

  return NextResponse.json({ exam }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "exams.create"); }
  catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }

  const parsed = PatchExamSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const exam = await db.exam.findFirst({
    where: { id: parsed.data.examId, course: teachingCourseWhere(session.user.id) },
    select: { id: true, status: true, courseId: true },
  });
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

  if (parsed.data.action === "publish") {
    if (exam.status === "PUBLISHED") return NextResponse.json({ error: "Already published." }, { status: 409 });
    const qCount = await db.quizQuestion.count({ where: { examId: exam.id } });
    if (qCount === 0) return NextResponse.json({ error: "Cannot publish an exam with no questions." }, { status: 400 });
    const updated = await db.exam.update({ where: { id: exam.id }, data: { status: "PUBLISHED" } });
    await audit({ actorId: session.user.id, action: "UPDATE", entityType: "Exam", entityId: exam.id, metadata: { action: "publish" } });
    return NextResponse.json({ exam: updated });
  }

  if (parsed.data.action === "archive") {
    const updated = await db.exam.update({ where: { id: exam.id }, data: { status: "ARCHIVED" } });
    return NextResponse.json({ exam: updated });
  }

  if (parsed.data.action === "edit") {
    if (exam.status === "PUBLISHED") {
      return NextResponse.json({ error: "Cannot edit a published exam. Archive it first." }, { status: 409 });
    }
    const { title, instructions, timeLimitMin, passPercent, shuffleQuestions, startWindowAt } = parsed.data;
    const updated = await db.exam.update({
      where: { id: exam.id },
      data: {
        ...(title != null && { title }),
        ...(instructions != null && { instructions }),
        ...(timeLimitMin !== undefined && { timeLimitMin }),
        ...(passPercent != null && { passPercent }),
        ...(shuffleQuestions != null && { shuffleQuestions }),
        ...(startWindowAt !== undefined && { startWindowAt: startWindowAt ? new Date(startWindowAt) : null }),
      },
    });
    return NextResponse.json({ exam: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
