import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/principal/examinations/[examId]/results
 * Download exam results as CSV
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { examId: string } }
) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "exams.mark")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const exam = await db.exam.findUnique({
      where: { id: params.examId },
      include: {
        course: { select: { title: true, courseCode: true } },
        attempts: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                studentNumber: true,
              },
            },
          },
          orderBy: [{ user: { name: "asc" } }, { number: "asc" }],
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Generate CSV
    const csvLines = [
      "Student Name,Student Number,Email,Attempt,Status,Started At,Submitted At,Score,Max Score,Percentage,Passed,Tab Switches",
    ];

    for (const attempt of exam.attempts) {
      const percentage = attempt.score !== null && attempt.maxScore !== null
        ? ((attempt.score / attempt.maxScore) * 100).toFixed(2)
        : "-";

      const passed = attempt.passed !== null
        ? (attempt.passed ? "Yes" : "No")
        : "-";

      const row = [
        `"${attempt.user.name}"`,
        `"${attempt.user.studentNumber || "-"}"`,
        `"${attempt.user.email || "-"}"`,
        attempt.number.toString(),
        attempt.status,
        `"${new Date(attempt.startedAt).toLocaleString("en-UG")}"`,
        attempt.submittedAt ? `"${new Date(attempt.submittedAt).toLocaleString("en-UG")}"` : "-",
        attempt.score !== null ? attempt.score.toString() : "-",
        attempt.maxScore !== null ? attempt.maxScore.toString() : "-",
        percentage,
        passed,
        attempt.tabSwitches.toString(),
      ];

      csvLines.push(row.join(","));
    }

    const csvContent = csvLines.join("\n");
    const filename = `exam-results-${exam.course.courseCode}-${exam.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.csv`;

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "EXPORT",
        entity: "Exam",
        entityId: exam.id,
        details: `Downloaded exam results: ${exam.title} (${exam.course.title}) - ${exam.attempts.length} attempts`,
      },
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Failed to export exam results:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
