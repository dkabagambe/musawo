import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { can } from "@/lib/rbac";
export const dynamic = "force-dynamic";


export const metadata = { title: "Reports - Teaching Portal" };

export default async function TutorReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "reports.view")) redirect("/403");

  const courses = await db.course.findMany({
    where: teachingCourseWhere(session.user.id),
    select: { id: true, title: true },
  });
  const courseIds = courses.map((c) => c.id);
  const empty = courseIds.length === 0;

  const [
    totalStudents,
    activeEnrolments,
    completedEnrolments,
    totalExams,
    passedAttempts,
    totalAttempts,
    upcomingClasses,
    totalAttendance,
    totalAssignments,
    submittedAssignments,
  ] = await Promise.all([
    empty ? Promise.resolve(0) : db.enrolment.count({ where: { courseId: { in: courseIds }, status: { in: ["ACTIVE", "COMPLETED"] } } }),
    empty ? Promise.resolve(0) : db.enrolment.count({ where: { courseId: { in: courseIds }, status: "ACTIVE" } }),
    empty ? Promise.resolve(0) : db.enrolment.count({ where: { courseId: { in: courseIds }, status: "COMPLETED" } }),
    empty ? Promise.resolve(0) : db.exam.count({ where: { courseId: { in: courseIds } } }),
    empty ? Promise.resolve(0) : db.examAttempt.count({ where: { exam: { courseId: { in: courseIds } }, status: "SUBMITTED", passed: true } }),
    empty ? Promise.resolve(0) : db.examAttempt.count({ where: { exam: { courseId: { in: courseIds } }, status: "SUBMITTED" } }),
    empty ? Promise.resolve(0) : db.liveClass.count({ where: { courseId: { in: courseIds }, status: { in: ["SCHEDULED", "LIVE"] } } }),
    empty ? Promise.resolve(0) : db.attendance.count({ where: { liveClass: { courseId: { in: courseIds } } } }),
    empty ? Promise.resolve(0) : db.assignment.count({ where: { courseId: { in: courseIds } } }),
    empty ? Promise.resolve(0) : db.assignmentSubmission.count({ where: { assignment: { courseId: { in: courseIds } } } }),
  ]);

  const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : null;

  const stats = [
    { label: "Students in my courses", value: totalStudents },
    { label: "Active enrolments", value: activeEnrolments },
    { label: "Completions", value: completedEnrolments },
    { label: "Exams created", value: totalExams },
    { label: "Exam submissions", value: totalAttempts },
    { label: "Pass rate", value: passRate !== null ? `${passRate}%` : "N/A" },
    { label: "Upcoming/live classes", value: upcomingClasses },
    { label: "Attendance records", value: totalAttendance },
    { label: "Assignments", value: totalAssignments },
    { label: "Assignment submissions", value: submittedAssignments },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Summary across {courses.length} course{courses.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card text-center">
            <p className="text-2xl font-bold text-primary">
              {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
            </p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="font-semibold text-sm text-primary mb-4">My Courses</h2>
        {courses.length === 0 ? (
          <p className="text-xs text-gray-400">No courses assigned.</p>
        ) : (
          <ul className="space-y-2">
            {courses.map((c) => (
              <li key={c.id} className="text-sm text-gray-700">{c.title}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
