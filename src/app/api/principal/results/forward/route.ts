import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const forwardSchema = z.object({
  examId: z.string(),
});

/**
 * POST /api/principal/results/forward
 * Forward exam results to Director for publication approval
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "grades.publish")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = forwardSchema.parse(body);

    const exam = await db.exam.findUnique({
      where: { id: validated.examId },
      include: {
        course: { select: { title: true, courseCode: true } },
        attempts: {
          where: { status: "SCORED" },
          include: {
            user: { select: { name: true, studentNumber: true } },
          },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    if (exam.attempts.length === 0) {
      return NextResponse.json({ error: "No scored results to publish" }, { status: 400 });
    }

    // Check if already forwarded
    const existingRequest = await db.approvalRequest.findFirst({
      where: {
        type: "RESULTS_PUBLICATION",
        examId: exam.id,
        status: { in: ["SUBMITTED", "IN_REVIEW"] },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "Results already forwarded for approval" },
        { status: 400 }
      );
    }

    // Create approval request
    const approvalRequest = await db.approvalRequest.create({
      data: {
        type: "RESULTS_PUBLICATION",
        requestedById: session.user.id,
        examId: exam.id,
        courseId: exam.courseId,
        status: "SUBMITTED",
        description: `Publication of ${exam.title} results for ${exam.attempts.length} student(s)`,
        metadata: JSON.stringify({
          examTitle: exam.title,
          courseTitle: exam.course.title,
          studentCount: exam.attempts.length,
          students: exam.attempts.map((a) => ({
            name: a.user.name,
            studentNumber: a.user.studentNumber,
            score: a.score,
            maxScore: a.maxScore,
            passed: a.passed,
          })),
        }),
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "FORWARD",
        entity: "ExamResults",
        entityId: exam.id,
        details: `Forwarded ${exam.title} results to Director for publication (${exam.attempts.length} students)`,
      },
    });

    return NextResponse.json({ success: true, approvalRequest });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to forward results:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
