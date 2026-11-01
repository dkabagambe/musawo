import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";

export const metadata = { title: "Reports & Analytics - Director" };

export default async function DirectorReportsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "reports.academic")) redirect("/login");

  const [
    totalStudents,
    activeEnrolments,
    completedEnrolments,
    pendingApplications,
    publishedCourses,
    totalExamAttempts,
    passedAttempts,
    totalCertificates,
    pendingApprovals,
    openTickets,
    totalInstructors,
    liveClasses,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    db.enrolment.count({ where: { status: "ACTIVE" } }),
    db.enrolment.count({ where: { status: "COMPLETED" } }),
    db.application.count({ where: { status: "SUBMITTED" } }),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.examAttempt.count({ where: { status: "SUBMITTED" } }),
    db.examAttempt.count({ where: { status: "SUBMITTED", passed: true } }),
    db.certificate.count({ where: { revokedAt: null } }),
    db.approvalRequest.count({ where: { status: { in: ["SUBMITTED", "IN_REVIEW"] } } }),
    db.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.user.count({ where: { role: "INSTRUCTOR", status: "ACTIVE" } }),
    db.liveClass.count({ where: { status: { in: ["SCHEDULED", "LIVE"] } } }),
  ]);

  const passRate = totalExamAttempts > 0
    ? Math.round((passedAttempts / totalExamAttempts) * 100)
    : null;

  const enrolmentsByCourse = await db.enrolment.groupBy({
    by: ["courseId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 7,
  });
  const courseIds = enrolmentsByCourse.map((e) => e.courseId);
  const courseTitles = await db.course.findMany({
    where: { id: { in: courseIds } },
    select: { id: true, title: true },
  });
  const titleMap = Object.fromEntries(courseTitles.map((c) => [c.id, c.title]));

  const sections = [
    {
      heading: "Students",
      rows: [
        { label: "Active students", value: totalStudents },
        { label: "Active enrolments", value: activeEnrolments },
        { label: "Completed enrolments", value: completedEnrolments },
        { label: "Pending applications", value: pendingApplications },
      ],
    },
    {
      heading: "Academic",
      rows: [
        { label: "Published courses", value: publishedCourses },
        { label: "Active instructors", value: totalInstructors },
        { label: "Upcoming/live classes", value: liveClasses },
        { label: "Certificates issued", value: totalCertificates },
      ],
    },
    {
      heading: "Examinations",
      rows: [
        { label: "Total submissions", value: totalExamAttempts },
        { label: "Passed", value: passedAttempts },
        { label: "Pass rate", value: passRate !== null ? `${passRate}%` : "N/A" },
      ],
    },
    {
      heading: "Operations",
      rows: [
        { label: "Pending approvals", value: pendingApprovals },
        { label: "Open support tickets", value: openTickets },
      ],
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">Reports & Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Institution-wide snapshot</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {sections.map((s) => (
          <div key={s.heading} className="card">
            <h2 className="font-semibold text-sm text-primary mb-4">{s.heading}</h2>
            <div className="space-y-2">
              {s.rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{r.label}</span>
                  <span className="font-bold text-sm text-primary">{typeof r.value === "number" ? r.value.toLocaleString() : r.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="font-semibold text-sm text-primary mb-4">Enrolments by Course</h2>
        <div className="space-y-3">
          {enrolmentsByCourse.map((e) => {
            const maxCount = enrolmentsByCourse[0]._count.id || 1;
            const pct = Math.round((e._count.id / maxCount) * 100);
            return (
              <div key={e.courseId}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-700 truncate pr-4">{titleMap[e.courseId] ?? e.courseId}</span>
                  <span className="font-semibold text-primary flex-shrink-0">{e._count.id}</span>
                </div>
                <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {enrolmentsByCourse.length === 0 && (
            <p className="text-xs text-gray-400">No enrolments yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
