import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const extendSchema = z.object({
  extensionMinutes: z.number().min(1).max(180),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

/**
 * POST /api/principal/examinations/attempts/[attemptId]/extend
 * Extend exam time in emergency (audited)
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
    const validated = extendSchema.parse(body);

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

    if (!attempt.timeLimitEndsAt) {
      return NextResponse.json({ error: "No time limit set for this attempt" }, { status: 400 });
    }

    // Calculate new end time
    const currentEndTime = new Date(attempt.timeLimitEndsAt);
    const newEndTime = new Date(currentEndTime.getTime() + validated.extensionMinutes * 60 * 1000);

    // Update attempt
    const updated = await db.examAttempt.update({
      where: { id: params.attemptId },
      data: {
        timeLimitEndsAt: newEndTime,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "EXTEND_EXAM",
        entity: "ExamAttempt",
        entityId: attempt.id,
        details: `Extended exam time by ${validated.extensionMinutes} minutes for ${attempt.user.name} (${attempt.user.studentNumber}) - ${attempt.exam.title}. Reason: ${validated.reason}`,
        metadata: JSON.stringify({
          attemptId: attempt.id,
          studentName: attempt.user.name,
          studentNumber: attempt.user.studentNumber,
          examTitle: attempt.exam.title,
          courseTitle: attempt.exam.course.title,
          extensionMinutes: validated.extensionMinutes,
          oldEndTime: attempt.timeLimitEndsAt,
          newEndTime,
          reason: validated.reason,
        }),
      },
    });

    return NextResponse.json({ success: true, newEndTime });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to extend exam time:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
