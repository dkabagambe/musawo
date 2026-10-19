import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Users, BookOpen, TrendingUp, AlertCircle, Award, ClipboardCheck, ChevronRight, ArrowUpRight } from "lucide-react";
import StatCard from "@/components/ui/StatCard";

export const metadata = { title: "Executive Dashboard" };

export default async function DirectorDashboardPage() {
  const session = await auth();
  if (!session?.user || can(session.user.role, "approvals.decide") === false) redirect("/login");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalStudents, activeEnrolments, monthRevenue, lastMonthRevenue,
    outstandingFees, pendingApprovals, passedExams, totalExams,
    recentPayments, pendingRequests,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.enrolment.count({ where: { status: "ACTIVE" } }),
    db.payment.aggregate({ where: { status: "COMPLETED", paidAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { status: "COMPLETED", paidAt: { gte: startOfLastMonth, lt: startOfMonth } }, _sum: { amount: true } }),
    db.enrolment.aggregate({ where: { status: "ACTIVE" }, _sum: { totalAmountUgx: true, paidAmountUgx: true } }),
    db.approvalRequest.count({ where: { status: "PENDING" } }),
    db.examAttempt.count({ where: { status: "MARKED", passed: true } }),
    db.examAttempt.count({ where: { status: "MARKED" } }),
    db.payment.findMany({
      where: { status: "COMPLETED" },
      orderBy: { paidAt: "desc" },
      take: 6,
      include: { enrolment: { include: { user: { select: { name: true } }, course: { select: { title: true } } } } },
    }),
    db.approvalRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { initiator: { select: { name: true, role: true } } },
    }),
  ]);

  const monthRevenueUgx = monthRevenue._sum.amount ?? 0;
  const lastMonthRevenueUgx = lastMonthRevenue._sum.amount ?? 0;
  const outstanding = Math.max(0, (outstandingFees._sum.totalAmountUgx ?? 0) - (outstandingFees._sum.paidAmountUgx ?? 0));
  const passRate = totalExams > 0 ? Math.round((passedExams / totalExams) * 100) : 0;
  const revenueTrend = lastMonthRevenueUgx > 0
    ? `${monthRevenueUgx >= lastMonthRevenueUgx ? "+" : ""}${Math.round(((monthRevenueUgx - lastMonthRevenueUgx) / lastMonthRevenueUgx) * 100)}% vs last month`
    : undefined;

  const APPROVAL_TYPE_LABELS: Record<string, string> = {
    REFUND: "Refund request",
    WAIVER: "Fee waiver",
    FEE_CHANGE: "Fee change",
    MANUAL_ENROLMENT: "Manual enrolment",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Executive Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            {now.toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        {pendingApprovals > 0 && (
          <Link href="/director/approvals"
            className="flex items-center gap-2 bg-danger text-white text-sm font-bold px-4 py-2.5 rounded-xl no-underline hover:bg-danger/90 transition-colors shadow-sm">
            <AlertCircle className="w-4 h-4" />
            {pendingApprovals} pending
          </Link>
        )}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Students"    value={totalStudents}                         icon={<Users className="w-5 h-5" />}        href="/admin/students"       color="primary" />
        <StatCard label="Active Enrolments" value={activeEnrolments}                      icon={<BookOpen className="w-5 h-5" />}     href="/admin/students"       color="primary" />
        <StatCard label="Revenue This Month" value={`UGX ${(monthRevenueUgx/1000).toFixed(0)}k`} icon={<TrendingUp className="w-5 h-5" />} href="/bursar" color="success" trend={revenueTrend ? { label: revenueTrend, positive: monthRevenueUgx >= lastMonthRevenueUgx } : undefined} />
        <StatCard label="Outstanding Fees"  value={`UGX ${(outstanding/1000).toFixed(0)}k`}  icon={<AlertCircle className="w-5 h-5" />}  href="/bursar"               color="warning" />
        <StatCard label="Exam Pass Rate"    value={`${passRate}%`}                        icon={<Award className="w-5 h-5" />}        href="/admin"                color="accent"  />
        <StatCard label="Pending Approvals" value={pendingApprovals}                      icon={<ClipboardCheck className="w-5 h-5" />} href="/director/approvals" color={pendingApprovals > 0 ? "danger" : "primary"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Pending approvals */}
        <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-bold text-primary">Pending Approvals</h2>
            <Link href="/director/approvals" className="text-xs text-accent font-semibold no-underline hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {pendingRequests.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-400 text-sm">No pending approvals 🎉</p>
              </div>
            ) : pendingRequests.map((r) => (
              <Link key={r.id} href={`/director/approvals/${r.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface no-underline transition-colors group">
                <div className="w-9 h-9 bg-warning/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary truncate">
                    {APPROVAL_TYPE_LABELS[r.type] ?? r.type.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {r.initiator.name} · {new Date(r.createdAt).toLocaleDateString("en-UG")}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-semibold bg-warning/10 text-amber-700 px-2 py-0.5 rounded-full">Pending</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent payments */}
        <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-bold text-primary">Recent Payments</h2>
            <Link href="/bursar/payments" className="text-xs text-accent font-semibold no-underline hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentPayments.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-400 text-sm">No payments yet.</p>
              </div>
            ) : recentPayments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center flex-shrink-0 text-success font-bold text-xs">
                  {p.enrolment.user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">{p.enrolment.user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{p.enrolment.course.title}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-success">UGX {p.amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-UG") : "-"}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Quick nav to other portals */}
      <section>
        <h2 className="font-bold text-primary mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { href: "/admin/students",  label: "Students",    icon: "👥", color: "bg-primary/5  hover:bg-primary/10  text-primary" },
            { href: "/admin/courses",   label: "Courses",     icon: "📚", color: "bg-accent/5   hover:bg-accent/10   text-accent"  },
            { href: "/bursar",          label: "Finance",     icon: "💰", color: "bg-success/5  hover:bg-success/10  text-success" },
            { href: "/director/staff",  label: "Staff",       icon: "🏥", color: "bg-primary/5  hover:bg-primary/10  text-primary" },
            { href: "/director/audit",  label: "Audit Log",   icon: "🔍", color: "bg-gray-50    hover:bg-gray-100    text-gray-700"},
            { href: "/admin/reports",   label: "Reports",     icon: "📊", color: "bg-accent/5   hover:bg-accent/10   text-accent"  },
          ].map((l) => (
            <Link key={l.href} href={l.href}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border border-border no-underline transition-all hover:-translate-y-0.5 hover:shadow-sm ${l.color}`}>
              <span className="text-2xl">{l.icon}</span>
              <span className="text-xs font-semibold text-center">{l.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
