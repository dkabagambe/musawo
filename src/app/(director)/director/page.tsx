import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "Executive Dashboard - Director" };

export default async function DirectorDashboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPERADMIN") redirect("/login");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalStudents,
    activeEnrolments,
    monthRevenue,
    outstandingFees,
    pendingApprovals,
    passedExams,
    totalExams,
    recentPayments,
    pendingRequests,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.enrolment.count({ where: { status: "ACTIVE" } }),
    db.payment.aggregate({
      where: { status: "COMPLETED", paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    // Outstanding = enrolled students whose paid < total
    db.enrolment.aggregate({
      where: { status: "ACTIVE" },
      _sum: { totalAmountUgx: true, paidAmountUgx: true },
    }),
    db.approvalRequest.count({ where: { status: "PENDING" } }),
    db.examAttempt.count({ where: { status: "MARKED", passed: true } }),
    db.examAttempt.count({ where: { status: "MARKED" } }),
    db.payment.findMany({
      where: { status: "COMPLETED" },
      orderBy: { paidAt: "desc" },
      take: 6,
      include: {
        enrolment: {
          include: {
            user:   { select: { name: true } },
            course: { select: { title: true } },
          },
        },
      },
    }),
    db.approvalRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { initiator: { select: { name: true, role: true } } },
    }),
  ]);

  const monthRevenueUgx  = monthRevenue._sum.amount ?? 0;
  const totalOwed        = outstandingFees._sum.totalAmountUgx ?? 0;
  const totalPaid        = outstandingFees._sum.paidAmountUgx ?? 0;
  const outstanding      = Math.max(0, totalOwed - totalPaid);
  const passRate         = totalExams > 0 ? Math.round((passedExams / totalExams) * 100) : 0;

  const STATS = [
    { icon: "👥", label: "Total students",    value: totalStudents.toLocaleString(),         href: "/admin/students", color: "text-primary" },
    { icon: "📚", label: "Active enrolments", value: activeEnrolments.toLocaleString(),       href: "/admin/students", color: "text-primary" },
    { icon: "💰", label: "Revenue this month", value: `UGX ${monthRevenueUgx.toLocaleString()}`, href: "/bursar",     color: "text-success" },
    { icon: "⚠️", label: "Outstanding fees",  value: `UGX ${outstanding.toLocaleString()}`,  href: "/bursar",         color: "text-warning" },
    { icon: "📝", label: "Exam pass rate",     value: `${passRate}%`,                        href: "/admin",           color: "text-primary" },
    { icon: "📋", label: "Pending approvals",  value: pendingApprovals.toLocaleString(),      href: "/director/approvals", color: pendingApprovals > 0 ? "text-danger" : "text-primary" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl">Executive Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {now.toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {STATS.map((s) => (
          <Link key={s.label} href={s.href} className="card no-underline hover:shadow-md transition-shadow">
            <p className="text-2xl mb-1" aria-hidden="true">{s.icon}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pending approvals */}
        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Pending approvals</h2>
            <Link href="/director/approvals" className="text-xs text-accent no-underline hover:underline">
              View all
            </Link>
          </div>
          {pendingRequests.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No pending approvals. 🎉</p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((r) => (
                <Link
                  key={r.id}
                  href={`/director/approvals/${r.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-surface no-underline transition-colors"
                >
                  <span className="text-xl" aria-hidden="true">📋</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-gray-400">
                      {r.initiator.name} · {new Date(r.createdAt).toLocaleDateString("en-UG")}
                    </p>
                  </div>
                  <span className="badge badge-warning text-xs">Pending</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent payments */}
        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent payments</h2>
            <Link href="/bursar" className="text-xs text-accent no-underline hover:underline">
              View all
            </Link>
          </div>
          {recentPayments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No payments yet.</p>
          ) : (
            <div className="space-y-2">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{p.enrolment.user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{p.enrolment.course.title}</p>
                  </div>
                  <p className="font-semibold text-success ml-4 flex-shrink-0">
                    UGX {p.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
