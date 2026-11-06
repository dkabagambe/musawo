import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";
export const dynamic = "force-dynamic";


export const metadata = { title: "Finance Overview - Director" };

export default async function DirectorFinancePage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "payments.view")) redirect("/login");

  const [
    paymentStats,
    pendingPaymentProofs,
    pendingFeeApprovals,
    recentPayments,
  ] = await Promise.all([
    db.payment.groupBy({ by: ["status"], _count: { _all: true }, _sum: { amount: true } }),
    db.approvalRequest.count({
      where: { type: "PAYMENT_PROOF", status: { in: ["SUBMITTED", "IN_REVIEW"] } },
    }),
    db.approvalRequest.count({
      where: { type: { in: ["FEE_CHANGE", "WAIVER", "REFUND"] }, status: { in: ["SUBMITTED", "IN_REVIEW"] } },
    }),
    db.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        enrolment: {
          include: {
            user: { select: { name: true, studentNumber: true } },
            course: { select: { title: true } },
          },
        },
      },
    }),
  ]);

  const totalConfirmed = paymentStats.find((s) => s.status === "COMPLETED")?._sum.amount ?? 0;
  const totalPending = paymentStats.find((s) => s.status === "PENDING")?._sum.amount ?? 0;
  const totalCount = paymentStats.reduce((s, p) => s + p._count._all, 0);

  const STATUS_STYLE: Record<string, string> = {
    COMPLETED: "badge-success",
    PENDING: "badge-warning",
    PENDING_APPROVAL: "badge-warning",
    FAILED: "badge-danger",
    REFUNDED: "badge-info",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Finance Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Read-only. Approve payment proofs and fee changes via Approvals.</p>
      </div>

      {/* Alert banners */}
      {(pendingPaymentProofs > 0 || pendingFeeApprovals > 0) && (
        <div className="space-y-2">
          {pendingPaymentProofs > 0 && (
            <div className="card bg-warning/5 border-warning/40 text-sm text-amber-800">
              <strong>{pendingPaymentProofs}</strong> payment proof{pendingPaymentProofs !== 1 ? "s" : ""} awaiting your approval.{" "}
              <Link href="/director/finance/approvals" className="underline font-semibold">Review</Link>
            </div>
          )}
          {pendingFeeApprovals > 0 && (
            <div className="card bg-warning/5 border-warning/40 text-sm text-amber-800">
              <strong>{pendingFeeApprovals}</strong> fee change / waiver request{pendingFeeApprovals !== 1 ? "s" : ""} pending.{" "}
              <Link href="/director/finance/approvals" className="underline font-semibold">Review</Link>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-primary">UGX {(totalConfirmed / 1000).toFixed(0)}k</p>
          <p className="text-xs text-gray-500 mt-1">Confirmed revenue</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-warning">UGX {(totalPending / 1000).toFixed(0)}k</p>
          <p className="text-xs text-gray-500 mt-1">Pending payments</p>
        </div>
        <div className="card text-center col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold text-primary">{totalCount}</p>
          <p className="text-xs text-gray-500 mt-1">Total transactions</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link href="/director/finance/payments" className="btn-outline text-sm no-underline">All payments</Link>
        <Link href="/director/finance/approvals" className="btn-outline text-sm no-underline">Pending approvals</Link>
        <Link href="/director/finance/ledger" className="btn-outline text-sm no-underline">Ledger</Link>
      </div>

      {/* Recent payments */}
      <div className="card overflow-x-auto">
        <h2 className="font-semibold text-sm text-primary mb-4">Recent Payments</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Student</th>
              <th className="pb-2 font-medium pr-4">Programme</th>
              <th className="pb-2 font-medium pr-4">Amount</th>
              <th className="pb-2 font-medium pr-4">Status</th>
              <th className="pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recentPayments.map((p) => (
              <tr key={p.id} className="hover:bg-surface/40">
                <td className="py-2.5 pr-4 font-medium">{p.enrolment?.user?.name ?? "N/A"}</td>
                <td className="py-2.5 pr-4 text-xs text-gray-500">{p.enrolment?.course?.title ?? "N/A"}</td>
                <td className="py-2.5 pr-4 font-semibold text-primary">UGX {p.amount.toLocaleString()}</td>
                <td className="py-2.5 pr-4">
                  <span className={`badge text-xs ${STATUS_STYLE[p.status] ?? "badge-info"}`}>
                    {p.status.replace("_", " ")}
                  </span>
                </td>
                <td className="py-2.5 text-xs text-gray-400">
                  {new Date(p.createdAt).toLocaleDateString("en-UG")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {recentPayments.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">No payments recorded yet.</p>
        )}
      </div>
    </div>
  );
}
