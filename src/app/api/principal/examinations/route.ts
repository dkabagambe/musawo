import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const questionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["MCQ", "TRUE_FALSE", "SHORT_ANSWER"]),
  question: z.string().min(1),
  points: z.number().min(1),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
});

const createExamSchema = z.object({
  courseId: z.string(),
  blockId: z.string().nullable(),
  title: z.string().min(1),
  instructions: z.string().optional(),
  timeLimitMin: z.number().nullable(),
  perQuestionSec: z.number().nullable(),
  attemptLimit: z.number().min(1).max(5),
  passPercent: z.number().min(0).max(100),
  shuffleQuestions: z.boolean(),
  startWindowAt: z.string().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  questions: z.array(questionSchema),
});

/**
 * POST /api/principal/examinations
 * Create new exam with questions
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "exams.mark")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = createExamSchema.parse(body);

    // Create exam with questions
    const exam = await db.exam.create({
      data: {
        courseId: validated.courseId,
        blockId: validated.blockId,
        title: validated.title,
        instructions: validated.instructions,
        timeLimitMin: validated.timeLimitMin,
        perQuestionSec: validated.perQuestionSec,
        attemptLimit: validated.attemptLimit,
        passPercent: validated.passPercent,
        shuffleQuestions: validated.shuffleQuestions,
        startWindowAt: validated.startWindowAt ? new Date(validated.startWindowAt) : null,
        status: validated.status,
        questions: {
          create: validated.questions.map((q, index) => ({
            type: q.type,
            question: q.question,
            points: q.points,
            options: q.options ? JSON.stringify(q.options) : null,
            correctAnswer: q.correctAnswer,
          })),
        },
      },
      include: {
        questions: true,
        course: { select: { title: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "Exam",
        entityId: exam.id,
        details: `Created exam: ${exam.title} (${exam.course.title}) with ${validated.questions.length} questions`,
      },
    });

    return NextResponse.json(exam);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to create exam:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
