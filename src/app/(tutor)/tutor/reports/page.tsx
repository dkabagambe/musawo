import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { can } from "@/lib/rbac";
import ReportsClient from "./ReportsClient";
export const dynamic = "force-dynamic";

export const metadata = { title: "Reports - Teaching Portal" };

export default async function TutorReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "reports.view")) redirect("/403");

  const courses = await db.course.findMany({
    where: teachingCourseWhere(session.user.id),
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
  const courseIds = courses.map((c) => c.id);
  const empty = courseIds.length === 0;

  // Per-course stats
  const perCourse = await Promise.all(
    courses.map(async (course) => {
      const [enrolled, completed, totalClasses, attendanceRows, assignmentRows, examRows] =
        await Promise.all([
          db.enrolment.count({ where: { courseId: course.id, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] } } }),
          db.enrolment.count({ where: { courseId: course.id, status: "COMPLETED" } }),
          db.liveClass.count({ where: { courseId: course.id, status: "COMPLETED" } }),
          db.attendance.aggregate({
            where: { liveClass: { courseId: course.id } },
            _count: { id: true },
          }),
          db.assignment.findMany({
            where: { courseId: course.id },
            select: { id: true, _count: { select: { submissions: true } } },
          }),
          db.examAttempt.findMany({
            where: { exam: { courseId: course.id }, status: "SUBMITTED" },
            select: { passed: true, score: true, maxScore: true },
          }),
        ]);

      const totalSubmissions = assignmentRows.reduce((s, a) => s + a._count.submissions, 0);
      const passedExams = examRows.filter((e) => e.passed === true).length;
      const passRate = examRows.length > 0 ? Math.round((passedExams / examRows.length) * 100) : null;

      return {
        id: course.id,
        title: course.title,
        enrolled,
        completed,
        completionRate: enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0,
        totalClasses,
        attendanceRecords: attendanceRows._count.id,
        assignments: assignmentRows.length,
        submissionsTotal: totalSubmissions,
        examAttempts: examRows.length,
        passRate,
      };
    })
  );

  // Global totals
  const totals = {
    students: empty ? 0 : await db.enrolment.count({ where: { courseId: { in: courseIds }, status: { in: ["ACTIVE", "COMPLETED"] } } }),
    active: empty ? 0 : await db.enrolment.count({ where: { courseId: { in: courseIds }, status: "ACTIVE" } }),
    completions: empty ? 0 : await db.enrolment.count({ where: { courseId: { in: courseIds }, status: "COMPLETED" } }),
    upcomingClasses: empty ? 0 : await db.liveClass.count({ where: { courseId: { in: courseIds }, status: { in: ["SCHEDULED", "LIVE"] } } }),
    attendanceRecords: empty ? 0 : await db.attendance.count({ where: { liveClass: { courseId: { in: courseIds } } } }),
    examAttempts: empty ? 0 : await db.examAttempt.count({ where: { exam: { courseId: { in: courseIds } }, status: "SUBMITTED" } }),
    assignments: empty ? 0 : await db.assignment.count({ where: { courseId: { in: courseIds } } }),
    assignmentSubmissions: empty ? 0 : await db.assignmentSubmission.count({ where: { assignment: { courseId: { in: courseIds } } } }),
  };

  return <ReportsClient totals={totals} perCourse={perCourse} />;
}
