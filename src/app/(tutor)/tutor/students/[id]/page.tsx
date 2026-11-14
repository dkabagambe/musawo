import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { can } from "@/lib/rbac";
import AvatarOrInitials from "@/components/ui/AvatarOrInitials";
import Link from "next/link";
import { ChevronRight, Mail } from "lucide-react";
export const dynamic = "force-dynamic";

export const metadata = { title: "Student Detail - Teaching Portal" };

export default async function TutorStudentDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "students.view")) redirect("/403");

  // Confirm student is enrolled in one of this tutor's courses
  const enrolment = await db.enrolment.findFirst({
    where: {
      userId: params.id,
      status: { in: ["ACTIVE", "COMPLETED", "PARTIALLY_PAID", "OVERDUE"] },
      course: teachingCourseWhere(session.user.id),
    },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, studentNumber: true, avatarUrl: true } },
      course: { select: { id: true, title: true, slug: true } },
    },
  });
  if (!enrolment) notFound();

  const student = enrolment.user;

  // All enrolments in tutor's courses
  const allEnrolments = await db.enrolment.findMany({
    where: {
      userId: params.id,
      course: teachingCourseWhere(session.user.id),
    },
    include: { course: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Attendance
  const attendance = await db.attendance.findMany({
    where: {
      userId: params.id,
      liveClass: { courseId: { in: allEnrolments.map((e) => e.courseId) } },
    },
    orderBy: { joinedAt: "desc" },
    take: 20,
    include: { liveClass: { select: { title: true, scheduledAt: true, course: { select: { title: true } } } } },
  });

  const totalClasses = attendance.length;
  const presentClasses = attendance.filter(
    (a) => a.markedPresent || a.startMark === "PRESENT" || a.startMark === "LATE"
  ).length;
  const attendancePct = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : null;

  // Assignment submissions
  const submissions = await db.assignmentSubmission.findMany({
    where: {
      userId: params.id,
      assignment: { course: teachingCourseWhere(session.user.id) },
    },
    orderBy: { submittedAt: "desc" },
    take: 10,
    include: { assignment: { select: { title: true, maxPoints: true, dueDate: true } } },
  });

  // Exam attempts
  const attempts = await db.examAttempt.findMany({
    where: {
      userId: params.id,
      exam: { course: teachingCourseWhere(session.user.id) },
    },
    orderBy: { submittedAt: "desc" },
    take: 10,
    include: { exam: { select: { title: true } } },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back */}
      <Link href="/tutor/students" className="text-sm text-gray-400 hover:text-primary no-underline inline-flex items-center gap-1">
        <ChevronRight className="w-3.5 h-3.5 rotate-180" /> My Students
      </Link>

      {/* Header */}
      <div className="flex items-start gap-5">
        <AvatarOrInitials name={student.name} avatarUrl={student.avatarUrl} size={64} />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-primary">{student.name}</h1>
          <p className="text-sm text-gray-500 font-mono">{student.studentNumber ?? "No student number"}</p>
          <p className="text-sm text-gray-400 mt-0.5">{student.email ?? student.phone ?? ""}</p>
        </div>
        <Link
          href={`/tutor/messages?userId=${student.id}`}
          className="btn-primary text-sm no-underline flex items-center gap-1.5 flex-shrink-0"
        >
          <Mail className="w-4 h-4" /> Message
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Courses enrolled", value: allEnrolments.length },
          { label: "Classes attended", value: `${presentClasses}/${totalClasses}` },
          { label: "Attendance", value: attendancePct != null ? `${attendancePct}%` : "N/A" },
          { label: "Submissions", value: submissions.length },
        ].map((s) => (
          <div key={s.label} className="card text-center py-5">
            <p className="text-xl font-bold text-primary">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Enrolments */}
      <section>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Enrolments</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Course</th>
                <th className="pb-2 font-medium pr-4">Status</th>
                <th className="pb-2 font-medium">Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allEnrolments.map((e) => (
                <tr key={e.id} className="hover:bg-surface/40">
                  <td className="py-2.5 pr-4 font-medium">{e.course.title}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`badge text-xs ${e.status === "ACTIVE" ? "badge-success" : "badge-info"}`}>
                      {e.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-2.5 text-xs text-gray-400">
                    {new Date(e.createdAt).toLocaleDateString("en-UG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Attendance history */}
      {attendance.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Attendance</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-border">
                  <th className="pb-2 font-medium pr-4">Class</th>
                  <th className="pb-2 font-medium pr-4 hidden sm:table-cell">Date</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attendance.map((a) => {
                  const mark = a.startMark ?? (a.markedPresent ? "PRESENT" : "ABSENT");
                  const markCls: Record<string, string> = {
                    PRESENT: "badge-success",
                    LATE: "badge-warning",
                    ABSENT: "badge-danger",
                    EXCUSED: "badge-info",
                  };
                  return (
                    <tr key={a.id} className="hover:bg-surface/40">
                      <td className="py-2.5 pr-4">
                        <p className="font-medium">{a.liveClass.title}</p>
                        <p className="text-xs text-gray-400">{a.liveClass.course.title}</p>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-500 hidden sm:table-cell">
                        {a.liveClass.scheduledAt ? new Date(a.liveClass.scheduledAt).toLocaleDateString("en-UG") : "-"}
                      </td>
                      <td className="py-2.5">
                        <span className={`badge text-xs ${markCls[mark] ?? "badge"}`}>{mark}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Assignment submissions */}
      {submissions.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Assignment Submissions</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-border">
                  <th className="pb-2 font-medium pr-4">Assignment</th>
                  <th className="pb-2 font-medium pr-4">Grade</th>
                  <th className="pb-2 font-medium pr-4">Status</th>
                  <th className="pb-2 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {submissions.map((s) => {
                  const isLate = s.assignment.dueDate && s.submittedAt && s.submittedAt > s.assignment.dueDate;
                  return (
                    <tr key={s.id} className="hover:bg-surface/40">
                      <td className="py-2.5 pr-4 font-medium">
                        {s.assignment.title}
                        {isLate && <span className="ml-2 text-xs text-danger badge badge-danger">Late</span>}
                      </td>
                      <td className="py-2.5 pr-4 font-semibold">
                        {s.grade != null ? `${s.grade}/${s.assignment.maxPoints}` : "-"}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`badge text-xs ${s.status === "GRADED" ? "badge-success" : "badge-warning"}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-xs text-gray-400">
                        {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString("en-UG") : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Exam attempts */}
      {attempts.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Exam Attempts</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-border">
                  <th className="pb-2 font-medium pr-4">Exam</th>
                  <th className="pb-2 font-medium pr-4">Score</th>
                  <th className="pb-2 font-medium pr-4">Result</th>
                  <th className="pb-2 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attempts.map((a) => {
                  const pct = a.score != null && a.maxScore ? Math.round((a.score / a.maxScore) * 100) : null;
                  return (
                    <tr key={a.id} className="hover:bg-surface/40">
                      <td className="py-2.5 pr-4 font-medium">{a.exam.title}</td>
                      <td className="py-2.5 pr-4 font-semibold">{pct != null ? `${pct}%` : "Pending"}</td>
                      <td className="py-2.5 pr-4">
                        {a.passed === true && <span className="badge badge-success text-xs">Pass</span>}
                        {a.passed === false && <span className="badge badge-danger text-xs">Fail</span>}
                        {a.passed === null && <span className="badge badge-warning text-xs">Pending</span>}
                      </td>
                      <td className="py-2.5 text-xs text-gray-400">
                        {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString("en-UG") : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
