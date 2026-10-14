import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "Bursar Dashboard" };

export default async function BursarDashboardPage() {
  const session = await auth();
  if (!session?.user || !["SUPERADMIN","BURSAR"].includes(session.user.role)) redirect("/login");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthRevenue, pendingPayments, pendingApprovals, recentPayments, outstanding] =
    await Promise.all([
      db.payment.aggregate({
        where: { status: "COMPLETED", paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      db.payment.count({ where: { status: "PENDING_APPROVAL" } }),
      db.approvalRequest.count({ where: { status: "PENDING", initiatorId: session.user.id } }),
      db.payment.findMany({
        where: { status: "COMPLETED" },
        orderBy: { paidAt: "desc" },
        take: 8,
        include: {
          enrolment: {
            include: {
              user:   { select: { name: true } },
              course: { select: { title: true } },
            },
          },
        },
      }),
      db.enrolment.aggregate({
        where: { status: "ACTIVE" },
        _sum: { totalAmountUgx: true, paidAmountUgx: true },
      }),
    ]);

  const monthRevenueUgx = monthRevenue._sum.amount ?? 0;
  const outstandingUgx  = Math.max(
    0,
    (outstanding._sum.totalAmountUgx ?? 0) - (outstanding._sum.paidAmountUgx ?? 0)
  );

  const STATS = [
    { icon: "💰", label: "Revenue this month",  value: `UGX ${monthRevenueUgx.toLocaleString()}`,  href: "/bursar/payments", color: "text-success" },
    { icon: "⚠️", label: "Outstanding fees",    value: `UGX ${outstandingUgx.toLocaleString()}`,   href: "/bursar/ledger",   color: "text-warning" },
    { icon: "🏦", label: "Bank transfers pending", value: pendingPayments.toLocaleString(),         href: "/admin/payments/pending", color: pendingPayments > 0 ? "text-danger" : "text-primary" },
    { icon: "📋", label: "My pending requests", value: pendingApprovals.toLocaleString(),           href: "/bursar/approvals", color: "text-primary" },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl mb-6">Bursar Dashboard</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map((s) => (
          <Link key={s.label} href={s.href} className="card no-underline hover:shadow-md transition-shadow">
            <p className="text-2xl mb-1" aria-hidden="true">{s.icon}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent payments</h2>
          <Link href="/bursar/payments" className="text-xs text-accent no-underline hover:underline">View all</Link>
        </div>
        {recentPayments.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-border">
                  <th className="pb-2 font-medium pr-4">Student</th>
                  <th className="pb-2 font-medium pr-4">Course</th>
                  <th className="pb-2 font-medium pr-4 text-right">Amount</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-4">{p.enrolment.user.name}</td>
                    <td className="py-2 pr-4 text-gray-500 text-xs">{p.enrolment.course.title}</td>
                    <td className="py-2 pr-4 text-right font-medium">UGX {p.amount.toLocaleString()}</td>
                    <td className="py-2 text-xs text-gray-400">{p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-UG") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
