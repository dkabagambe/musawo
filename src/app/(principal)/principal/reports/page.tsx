import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata = { title: "Academic Reports - Principal" };

export default async function PrincipalReportsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "reports.academic")) redirect("/dashboard");

  const [
    totalStudents,
    activeEnrolments,
    completedEnrolments,
    publishedCourses,
    passedAttempts,
    failedAttempts,
    totalCertificates,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    db.enrolment.count({ where: { status: "ACTIVE" } }),
    db.enrolment.count({ where: { status: "COMPLETED" } }),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.examAttempt.count({ where: { status: "SUBMITTED", passed: true } }),
    db.examAttempt.count({ where: { status: "SUBMITTED", passed: false } }),
    db.certificate.count({ where: { revokedAt: null } }),
  ]);

  const enrolmentsByCourse = await db.enrolment.groupBy({
    by: ["courseId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  const courseIds = enrolmentsByCourse.map((e) => e.courseId);
  const courseTitles = await db.course.findMany({
    where: { id: { in: courseIds } },
    select: { id: true, title: true },
  });
  const titleMap = Object.fromEntries(courseTitles.map((c) => [c.id, c.title]));

  const stats = [
    { label: "Active students",      value: totalStudents },
    { label: "Active enrolments",    value: activeEnrolments },
    { label: "Completed enrolments", value: completedEnrolments },
    { label: "Published courses",    value: publishedCourses },
    { label: "Passed attempts",      value: passedAttempts },
    { label: "Failed attempts",      value: failedAttempts },
    { label: "Certificates issued",  value: totalCertificates },
    { label: "Pass rate",            value: passedAttempts + failedAttempts > 0
        ? `${Math.round((passedAttempts / (passedAttempts + failedAttempts)) * 100)}%`
        : "N/A"
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">Academic Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of academic performance</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="card p-5">
            <p className="text-2xl font-extrabold text-primary">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Top courses by enrolments */}
      <section>
        <h2 className="font-semibold text-lg mb-3">Enrolments by course</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Course</th>
                <th className="pb-2 font-medium text-right">Enrolments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {enrolmentsByCourse.map((e) => (
                <tr key={e.courseId}>
                  <td className="py-2.5 pr-4 font-medium text-primary">
                    {titleMap[e.courseId] ?? e.courseId}
                  </td>
                  <td className="py-2.5 text-right font-bold">{e._count.id}</td>
                </tr>
              ))}
              {enrolmentsByCourse.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-gray-400 text-sm">No enrolments yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
