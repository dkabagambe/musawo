import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const questionSchema = z.object({
  id: z.string(),
  type: z.enum(["MCQ", "TRUE_FALSE", "SHORT_ANSWER"]),
  question: z.string().min(1),
  points: z.number().min(1),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
});

const updateExamSchema = z.object({
  courseId: z.string().optional(),
  blockId: z.string().nullable().optional(),
  title: z.string().min(1).optional(),
  instructions: z.string().optional(),
  timeLimitMin: z.number().nullable().optional(),
  perQuestionSec: z.number().nullable().optional(),
  attemptLimit: z.number().min(1).max(5).optional(),
  passPercent: z.number().min(0).max(100).optional(),
  shuffleQuestions: z.boolean().optional(),
  startWindowAt: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  questions: z.array(questionSchema).optional(),
});

/**
 * PATCH /api/principal/examinations/[examId]
 * Update exam and questions
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { examId: string } }
) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "exams.mark")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = updateExamSchema.parse(body);

    const existing = await db.exam.findUnique({
      where: { id: params.examId },
      include: { questions: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Update exam
    const updateData: any = {};
    if (validated.courseId) updateData.courseId = validated.courseId;
    if (validated.blockId !== undefined) updateData.blockId = validated.blockId;
    if (validated.title) updateData.title = validated.title;
    if (validated.instructions !== undefined) updateData.instructions = validated.instructions;
    if (validated.timeLimitMin !== undefined) updateData.timeLimitMin = validated.timeLimitMin;
    if (validated.perQuestionSec !== undefined) updateData.perQuestionSec = validated.perQuestionSec;
    if (validated.attemptLimit) updateData.attemptLimit = validated.attemptLimit;
    if (validated.passPercent !== undefined) updateData.passPercent = validated.passPercent;
    if (validated.shuffleQuestions !== undefined) updateData.shuffleQuestions = validated.shuffleQuestions;
    if (validated.startWindowAt !== undefined) {
      updateData.startWindowAt = validated.startWindowAt ? new Date(validated.startWindowAt) : null;
    }
    if (validated.status) updateData.status = validated.status;

    // Handle questions if provided
    if (validated.questions) {
      // Delete all existing questions and recreate
      await db.quizQuestion.deleteMany({
        where: { examId: params.examId },
      });

      updateData.questions = {
        create: validated.questions.map((q) => ({
          type: q.type,
          question: q.question,
          points: q.points,
          options: q.options ? JSON.stringify(q.options) : null,
          correctAnswer: q.correctAnswer,
        })),
      };
    }

    const exam = await db.exam.update({
      where: { id: params.examId },
      data: updateData,
      include: {
        questions: true,
        course: { select: { title: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "Exam",
        entityId: exam.id,
        details: `Updated exam: ${exam.title} (${exam.course.title})`,
      },
    });

    return NextResponse.json(exam);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to update exam:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
