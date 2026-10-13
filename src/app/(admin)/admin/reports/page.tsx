import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata = { title: "Reports - Admin" };

export default async function AdminReportsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "reports.view")) redirect("/dashboard");

  const [
    totalEnrolments,
    revenueResult,
    completedEnrolments,
    totalAttempts,
    passedAttempts,
    topCourses,
    recentCompleted,
  ] = await Promise.all([
    db.enrolment.count(),
    db.payment.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
    db.enrolment.count({ where: { status: "COMPLETED" } }),
    db.examAttempt.count({ where: { status: "MARKED" } }),
    db.examAttempt.count({ where: { status: "MARKED", passed: true } }),
    db.course.findMany({
      where: { status: "PUBLISHED" },
      include: { _count: { select: { enrolments: true } } },
      orderBy: { enrolments: { _count: "desc" } },
      take: 5,
    }),
    db.enrolment.findMany({
      where: { status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        user: { select: { name: true } },
        course: { select: { title: true } },
      },
    }),
  ]);

  const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;
  const completionRate = totalEnrolments > 0 ? Math.round((completedEnrolments / totalEnrolments) * 100) : 0;
  const totalRevenue = revenueResult._sum.amount ?? 0;

  const STATS = [
    { label: "Total enrolments", value: totalEnrolments.toLocaleString(), icon: "🎓" },
    { label: "Total revenue (UGX)", value: totalRevenue.toLocaleString(), icon: "💰" },
    { label: "Completion rate", value: `${completionRate}%`, icon: "✅" },
    { label: "Exam pass rate", value: `${passRate}%`, icon: "📝" },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">Reports</h1>
        <div className="flex gap-2">
          <a href="/api/admin/reports/enrolments" className="btn-outline text-sm no-underline">
            Export Enrolments CSV
          </a>
          <a href="/api/admin/reports/revenue" className="btn-outline text-sm no-underline">
            Export Revenue CSV
          </a>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map((s) => (
          <div key={s.label} className="card text-center">
            <p className="text-3xl mb-1" aria-hidden="true">{s.icon}</p>
            <p className="text-2xl font-bold text-primary">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold mb-4">Top courses by enrolment</h2>
          {topCourses.length === 0 ? (
            <p className="text-gray-400 text-sm">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {topCourses.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm">{c.title}</span>
                  <span className="badge badge-info text-xs">{c._count.enrolments}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Recent completions</h2>
          {recentCompleted.length === 0 ? (
            <p className="text-gray-400 text-sm">No completions yet.</p>
          ) : (
            <div className="space-y-3">
              {recentCompleted.map((e) => (
                <div key={e.id} className="flex items-start gap-3">
                  <span className="text-lg" aria-hidden="true">🎓</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{e.user.name}</p>
                    <p className="text-xs text-gray-400">{e.course.title}</p>
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(e.updatedAt).toLocaleDateString("en-UG")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
