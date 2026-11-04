import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
export const dynamic = "force-dynamic";

export const metadata = { title: "Reports - Registrar" };

export default async function RegistrarReportsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "grades.view")) redirect("/registrar");

  const [
    totalStudents,
    totalApplications,
    pendingApplications,
    acceptedApplications,
    totalEnrolments,
    activeEnrolments,
    completedEnrolments,
    totalExamAttempts,
    passedAttempts,
    totalCertificates,
    totalCourses,
    publishedCourses,
    totalTranscripts,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.application.count(),
    db.application.count({ where: { status: "SUBMITTED" } }),
    db.application.count({ where: { status: "ACCEPTED" } }),
    db.enrolment.count(),
    db.enrolment.count({ where: { status: "ACTIVE" } }),
    db.enrolment.count({ where: { status: "COMPLETED" } }),
    db.examAttempt.count({ where: { status: "SUBMITTED" } }),
    db.examAttempt.count({ where: { status: "SUBMITTED", passed: true } }),
    db.certificate.count({ where: { revokedAt: null } }),
    db.course.count(),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.enrolment.count({ where: { status: "COMPLETED" } }), // completed = eligible for transcript
  ]);

  const passRate = totalExamAttempts > 0
    ? Math.round((passedAttempts / totalExamAttempts) * 100)
    : null;

  const enrolmentsByCourse = await db.enrolment.groupBy({
    by: ["courseId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 8,
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
        { label: "Total registered students", value: totalStudents },
        { label: "Pending applications", value: pendingApplications },
        { label: "Accepted applications", value: acceptedApplications },
        { label: "Total applications", value: totalApplications },
      ],
    },
    {
      heading: "Enrolments",
      rows: [
        { label: "Total enrolments", value: totalEnrolments },
        { label: "Active enrolments", value: activeEnrolments },
        { label: "Completed enrolments", value: completedEnrolments },
      ],
    },
    {
      heading: "Examinations & Certification",
      rows: [
        { label: "Exam submissions", value: totalExamAttempts },
        { label: "Passed", value: passedAttempts },
        { label: "Pass rate", value: passRate !== null ? `${passRate}%` : "N/A" },
        { label: "Certificates issued", value: totalCertificates },
        { label: "Transcripts eligible", value: totalTranscripts },
      ],
    },
    {
      heading: "Programmes",
      rows: [
        { label: "Total courses", value: totalCourses },
        { label: "Published courses", value: publishedCourses },
      ],
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Academic registry snapshot</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {sections.map((s) => (
          <div key={s.heading} className="card">
            <h2 className="font-semibold text-sm text-primary mb-4">{s.heading}</h2>
            <div className="space-y-2">
              {s.rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{r.label}</span>
                  <span className="font-bold text-sm text-primary">
                    {typeof r.value === "number" ? r.value.toLocaleString() : r.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="font-semibold text-sm text-primary mb-4">Enrolments by Programme</h2>
        <div className="space-y-3">
          {enrolmentsByCourse.length === 0 ? (
            <p className="text-xs text-gray-400">No enrolments yet.</p>
          ) : (
            enrolmentsByCourse.map((e) => {
              const maxCount = enrolmentsByCourse[0]._count.id || 1;
              const pct = Math.round((e._count.id / maxCount) * 100);
              return (
                <div key={e.courseId}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700 truncate pr-4">
                      {titleMap[e.courseId] ?? e.courseId}
                    </span>
                    <span className="font-semibold text-primary flex-shrink-0">
                      {e._count.id}
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
