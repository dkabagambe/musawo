import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const stopSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

/**
 * POST /api/principal/examinations/attempts/[attemptId]/stop
 * Stop exam session in emergency (audited)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "exams.mark")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = stopSchema.parse(body);

    const attempt = await db.examAttempt.findUnique({
      where: { id: params.attemptId },
      include: {
        user: { select: { name: true, studentNumber: true } },
        exam: { select: { title: true, course: { select: { title: true } } } },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "Attempt is not in progress" }, { status: 400 });
    }

    // Force submit the attempt
    const updated = await db.examAttempt.update({
      where: { id: params.attemptId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "STOP_EXAM",
        entity: "ExamAttempt",
        entityId: attempt.id,
        details: `Emergency stop: Forcibly ended exam session for ${attempt.user.name} (${attempt.user.studentNumber}) - ${attempt.exam.title}. Reason: ${validated.reason}`,
        metadata: JSON.stringify({
          attemptId: attempt.id,
          studentName: attempt.user.name,
          studentNumber: attempt.user.studentNumber,
          examTitle: attempt.exam.title,
          courseTitle: attempt.exam.course.title,
          stoppedAt: new Date().toISOString(),
          reason: validated.reason,
          answersAtStop: attempt.answers,
          currentQuestionIndex: attempt.currentQuestionIndex,
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to stop exam session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
