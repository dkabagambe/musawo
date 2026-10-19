import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { TrendingUp, AlertCircle, Building2, ClipboardList, ChevronRight } from "lucide-react";
import StatCard from "@/components/ui/StatCard";

export const metadata = { title: "Bursar Dashboard" };

export default async function BursarDashboardPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "payments.view")) redirect("/login");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthRevenue, pendingPayments, pendingApprovals, recentPayments, outstanding, pendingClaims] = await Promise.all([
    db.payment.aggregate({ where: { status: "COMPLETED", paidAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    db.payment.count({ where: { status: "PENDING_APPROVAL" } }),
    db.approvalRequest.count({ where: { status: "PENDING", initiatorId: session.user.id } }),
    db.payment.findMany({
      where: { status: "COMPLETED" },
      orderBy: { paidAt: "desc" },
      take: 8,
      include: { enrolment: { include: { user: { select: { name: true } }, course: { select: { title: true } } } } },
    }),
    db.enrolment.aggregate({ where: { status: "ACTIVE" }, _sum: { totalAmountUgx: true, paidAmountUgx: true } }),
    db.manualPaymentClaim.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
  ]);

  const monthRevenueUgx = monthRevenue._sum.amount ?? 0;
  const outstandingUgx = Math.max(0, (outstanding._sum.totalAmountUgx ?? 0) - (outstanding._sum.paidAmountUgx ?? 0));

  const METHOD_LABELS: Record<string, string> = {
    MTN_MOMO: "MTN MoMo", AIRTEL_MONEY: "Airtel Money",
    BANK_TRANSFER: "Bank Transfer", SCHOLARSHIP: "Scholarship",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">Bursar Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {now.toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Alert banners */}
      {pendingClaims > 0 && (
        <div className="bg-warning/5 border border-warning/25 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-warning/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-amber-800">{pendingClaims} manual payment claim{pendingClaims !== 1 ? "s" : ""} to review</p>
            <p className="text-xs text-amber-700 mt-0.5">Students are waiting for their payments to be verified.</p>
          </div>
          <Link href="/bursar/payments" className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-xl no-underline transition-colors flex-shrink-0">
            Review claims
          </Link>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue This Month" value={`UGX ${(monthRevenueUgx/1000).toFixed(0)}k`} icon={<TrendingUp className="w-5 h-5" />} href="/bursar/payments" color="success" />
        <StatCard label="Outstanding Fees"   value={`UGX ${(outstandingUgx/1000).toFixed(0)}k`} icon={<AlertCircle className="w-5 h-5" />}  href="/bursar/ledger"   color="warning" />
        <StatCard label="Bank Transfers"     value={pendingPayments}   icon={<Building2 className="w-5 h-5" />}     href="/admin/payments/pending" color={pendingPayments > 0 ? "danger" : "primary"} />
        <StatCard label="My Requests"        value={pendingApprovals}  icon={<ClipboardList className="w-5 h-5" />} href="/bursar/approvals"       color="primary" />
      </div>

      {/* Recent payments table */}
      <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-primary">Recent Payments</h2>
          <Link href="/bursar/payments" className="text-xs text-accent font-semibold no-underline hover:underline flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {recentPayments.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-gray-400 text-sm">No payments recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-border bg-surface/50">
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider">Student</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider hidden sm:table-cell">Course</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider hidden md:table-cell">Method</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-right">Amount</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                          {p.enrolment.user.name.charAt(0)}
                        </div>
                        <span className="font-medium text-primary">{p.enrolment.user.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs hidden sm:table-cell max-w-[180px] truncate">{p.enrolment.course.title}</td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <span className="text-xs font-medium bg-surface px-2 py-1 rounded-lg text-gray-600">
                        {METHOD_LABELS[p.method] ?? p.method.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-bold text-success">UGX {p.amount.toLocaleString()}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400 hidden sm:table-cell">
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-UG") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/bursar/payments",  label: "All Payments",  icon: "💳" },
          { href: "/bursar/ledger",    label: "Ledger",        icon: "📒" },
          { href: "/bursar/approvals", label: "My Requests",   icon: "📋" },
          { href: "/admin/students",   label: "Students",      icon: "👥" },
        ].map((l) => (
          <Link key={l.href} href={l.href}
            className="bg-white rounded-2xl border border-border p-4 flex flex-col items-center gap-2 no-underline hover:shadow-card-hover hover:-translate-y-0.5 transition-all text-center">
            <span className="text-2xl">{l.icon}</span>
            <span className="text-xs font-semibold text-primary">{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
