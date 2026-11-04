/**
 * GET /api/results/export
 *
 * Exports exam attempt results as a CSV file.
 *
 * Query params:
 *   examId  — (optional) filter to a specific exam
 *
 * Permissions:
 *   - exams.mark    => tutor (own courses) or admin (all)
 *   - exams.release => principal or director (all)
 *
 * Returns: text/csv attachment
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells
    .map((c) => {
      const s = c == null ? "" : String(c);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    })
    .join(",");
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  const canMark    = can(role, "exams.mark");
  const canRelease = can(role, "exams.release");

  if (!canMark && !canRelease) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const examId = url.searchParams.get("examId") ?? undefined;

  // Tutors are scoped to exams in their assigned courses only
  const isTutor = role === "INSTRUCTOR";

  // For tutors: collect only their course IDs first
  let tutorCourseIds: string[] | undefined;
  if (isTutor) {
    const courses = await db.course.findMany({
      where: { tutorId: session.user.id },
      select: { id: true },
    });
    tutorCourseIds = courses.map((c) => c.id);
  }

  const attempts = await db.examAttempt.findMany({
    where: {
      status: { in: ["SUBMITTED", "MARKED"] },
      ...(examId ? { examId } : {}),
      ...(tutorCourseIds ? { exam: { courseId: { in: tutorCourseIds } } } : {}),
    },
    orderBy: [{ submittedAt: "asc" }],
    include: {
      user: { select: { name: true, studentNumber: true, email: true } },
      exam: {
        select: {
          title: true,
          passPercent: true,
          course: { select: { title: true } },
        },
      },
    },
  });

  const header = csvRow([
    "Student name",
    "Student number",
    "Email",
    "Course",
    "Exam",
    "Attempt no.",
    "Score (pts)",
    "Max score (pts)",
    "Percentage (%)",
    "Pass mark (%)",
    "Result",
    "Tab switches",
    "Submitted at",
  ]);

  const rows = attempts.map((a) => {
    const pct =
      a.score != null && a.maxScore && a.maxScore > 0
        ? Math.round((a.score / a.maxScore) * 100)
        : null;
    const result =
      a.passed === true ? "Pass" : a.passed === false ? "Fail" : "Pending review";

    return csvRow([
      a.user.name,
      a.user.studentNumber,
      a.user.email,
      a.exam.course.title,
      a.exam.title,
      a.number,
      a.score,
      a.maxScore,
      pct,
      a.exam.passPercent,
      result,
      a.tabSwitches,
      a.submittedAt ? new Date(a.submittedAt).toISOString() : "",
    ]);
  });

  const csv = [header, ...rows].join("\n");

  const filename = examId
    ? `exam-results-${examId.slice(0, 8)}.csv`
    : `exam-results-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
