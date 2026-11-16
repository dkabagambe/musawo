import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Finance - Director" };

interface Props {
  searchParams: { period?: string };
}

export default async function DirectorFinancePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "payments.view")) redirect("/login");

  // Period selector: "30" | "90" | "365" | "all" (default: all)
  const period = searchParams.period ?? "all";
  const periodDays = period === "30" ? 30 : period === "90" ? 90 : period === "365" ? 365 : null;
  const since = periodDays ? new Date(Date.now() - periodDays * 86_400_000) : undefined;
  const paymentDateFilter = since ? { createdAt: { gte: since } } : {};

  const [
    // Revenue: completed payments
    revenueStats,
    // Revenue by method
    revenueByMethod,
    // Monthly revenue (last 12 months)
    monthlyRevenue,
    // Enrolment fee outstanding
    enrolmentFees,
    // Pending finance approvals
    pendingApprovals,
    // Recent decided finance approvals
    recentApprovals,
    // Recent payments
    recentPayments,
    // Refunds and waivers
    refundStats,
  ] = await Promise.all([
    // Confirmed revenue total
    db.payment.aggregate({
      where:  { status: "COMPLETED", ...paymentDateFilter },
      _sum:   { amount: true },
      _count: { _all: true },
    }),
    // By method
    db.payment.groupBy({
      by:    ["method"],
      where: { status: "COMPLETED", ...paymentDateFilter },
      _sum:  { amount: true },
      _count:{ _all: true },
    }),
    // Monthly revenue — last 12 months via raw query
    db.$queryRaw<{ yr: number; mo: number; total: bigint }[]>`
      SELECT
        EXTRACT(YEAR  FROM "createdAt")::int AS yr,
        EXTRACT(MONTH FROM "createdAt")::int AS mo,
        SUM(amount)::bigint                  AS total
      FROM payments
      WHERE status = 'COMPLETED'
        ${since ? db.$queryRaw`AND "createdAt" >= ${since}` : db.$queryRaw``}
      GROUP BY yr, mo
      ORDER BY yr, mo
    `,
    // Collected vs outstanding per enrolment status
    db.enrolment.groupBy({
      by:   ["status"],
      _sum: { totalAmountUgx: true, paidAmountUgx: true },
      _count:{ _all: true },
    }),
    // Pending finance approvals
    db.approvalRequest.findMany({
      where: {
        type:   { in: ["PAYMENT_PROOF", "FEE_CHANGE", "WAIVER", "REFUND"] },
        status: { in: ["SUBMITTED", "IN_REVIEW"] },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, type: true, status: true, amount: true, reason: true,
        createdAt: true,
        initiator: { select: { name: true, role: true } },
        reviewer:  { select: { name: true } },
      },
    }),
    // Recently decided
    db.approvalRequest.findMany({
      where: {
        type:   { in: ["PAYMENT_PROOF", "FEE_CHANGE", "WAIVER", "REFUND"] },
        status: { in: ["APPROVED", "APPLIED", "REJECTED"] },
      },
      orderBy: { decidedAt: "desc" },
      take:    10,
      select: {
        id: true, type: true, status: true, amount: true,
        decidedAt: true, decisionNote: true,
        initiator: { select: { name: true } },
        decidedBy: { select: { name: true } },
      },
    }),
    // Recent payments with method, phase
    db.payment.findMany({
      where:   { ...paymentDateFilter },
      orderBy: { createdAt: "desc" },
      take:    20,
      select: {
        id: true, amount: true, method: true, status: true,
        createdAt: true, paidAt: true,
        bankTransferRef: true, gatewayRef: true,
        enrolment: {
          select: {
            status: true, paidPercent: true,
            user:   { select: { name: true, studentNumber: true } },
            course: { select: { title: true } },
          },
        },
      },
    }),
    // Refund and waiver amounts approved
    db.approvalRequest.aggregate({
      where:  { type: { in: ["REFUND", "WAIVER"] }, status: { in: ["APPROVED", "APPLIED"] } },
      _sum:   { amount: true },
      _count: { _all: true },
    }),
  ]);

  const confirmedRevenue = revenueStats._sum.amount ?? 0;
  const confirmedCount   = revenueStats._count._all;

  // Outstanding = sum(totalAmountUgx - paidAmountUgx) for active enrolments
  const outstanding = enrolmentFees
    .filter((e) => !["COMPLETED", "CANCELLED", "REFUNDED"].includes(e.status))
    .reduce((acc, e) => acc + ((e._sum.totalAmountUgx ?? 0) - (e._sum.paidAmountUgx ?? 0)), 0);

  const totalFees = enrolmentFees.reduce((acc, e) => acc + (e._sum.totalAmountUgx ?? 0), 0);
  const totalCollected = enrolmentFees.reduce((acc, e) => acc + (e._sum.paidAmountUgx ?? 0), 0);

  // Method labels
  const METHOD_LABEL: Record<string, string> = {
    MTN_MOMO:     "MTN MoMo",
    AIRTEL_MONEY: "Airtel Money",
    BANK_TRANSFER:"Bank transfer",
    CARD:         "Card",
    MANUAL:       "Manual",
  };

  const STATUS_STYLE: Record<string, string> = {
    COMPLETED:        "badge-success",
    PENDING:          "badge-warning",
    PENDING_APPROVAL: "badge-warning",
    FAILED:           "badge-danger",
    REFUNDED:         "badge-info",
  };
  const APPROVAL_STYLE: Record<string, string> = {
    SUBMITTED: "badge-warning",
    IN_REVIEW: "badge-info",
    APPROVED:  "badge-success",
    APPLIED:   "badge-success",
    REJECTED:  "badge-danger",
  };
  const TYPE_LABEL: Record<string, string> = {
    PAYMENT_PROOF: "Payment proof",
    FEE_CHANGE:    "Fee change",
    WAIVER:        "Waiver",
    REFUND:        "Refund",
  };
  const ENROL_STATUS_LABEL: Record<string, string> = {
    ACTIVE:          "Active",
    PARTIALLY_PAID:  "Partial payment",
    OVERDUE:         "Overdue",
    PENDING_PAYMENT: "Pending payment",
    COMPLETED:       "Completed",
    SUSPENDED:       "Suspended",
    CANCELLED:       "Cancelled",
    REFUNDED:        "Refunded",
  };

  function ageDays(d: Date) {
    return Math.floor((Date.now() - d.getTime()) / 86_400_000);
  }

  const PERIODS = [
    { key: "30",  label: "Last 30 days" },
    { key: "90",  label: "Last 90 days" },
    { key: "365", label: "Last year" },
    { key: "all", label: "All time" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary">Finance</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Read-only overview. Approve payment proofs and fee changes via Approvals.
          </p>
        </div>
        <a
          href={`/api/director/export/payments?period=${period}`}
          className="btn-secondary text-xs no-underline"
        >
          Export CSV
        </a>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 flex-wrap">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/director/finance?period=${p.key}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium no-underline transition-colors ${
              period === p.key
                ? "bg-primary text-white"
                : "bg-surface text-gray-600 hover:bg-primary/10"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* Pending approval alerts */}
      {pendingApprovals.length > 0 && (
        <div className="card bg-warning/5 border-warning/40 space-y-3">
          <h2 className="font-semibold text-sm text-amber-800">
            Finance approvals waiting ({pendingApprovals.length})
          </h2>
          <div className="space-y-2">
            {pendingApprovals.map((apr) => {
              const age = ageDays(apr.createdAt);
              return (
                <div key={apr.id} className="flex items-start justify-between gap-4 flex-wrap border-b border-warning/20 pb-2 last:border-0 last:pb-0">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-xs">{TYPE_LABEL[apr.type] ?? apr.type}</span>
                      <span className={`badge text-xs ${APPROVAL_STYLE[apr.status]}`}>
                        {apr.status === "IN_REVIEW" ? "In review" : "Waiting"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate max-w-sm">{apr.reason}</p>
                    <p className="text-xs text-gray-400">
                      {apr.initiator.name}
                      {apr.reviewer && <span> &rarr; {apr.reviewer.name}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {apr.amount != null && (
                      <span className="font-semibold text-xs text-primary">
                        UGX {apr.amount.toLocaleString()}
                      </span>
                    )}
                    <span className={`text-xs ${age >= 7 ? "text-danger font-semibold" : age >= 3 ? "text-amber-600" : "text-gray-400"}`}>
                      {age === 0 ? "Today" : `${age}d ago`}
                    </span>
                    <Link
                      href={`/director/approvals/${apr.id}`}
                      className="btn-primary text-xs px-3 py-1 no-underline"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Key figures */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Revenue collected",
            value: `UGX ${(confirmedRevenue / 1_000_000).toFixed(1)}M`,
            sub:   `${confirmedCount} payments`,
            style: "text-success",
          },
          {
            label: "Outstanding",
            value: `UGX ${(outstanding / 1_000_000).toFixed(1)}M`,
            sub:   "unpaid balance",
            style: outstanding > 0 ? "text-warning" : "text-gray-400",
          },
          {
            label: "Total fees billed",
            value: `UGX ${(totalFees / 1_000_000).toFixed(1)}M`,
            sub:   `${enrolmentFees.reduce((a, e) => a + e._count._all, 0)} enrolments`,
            style: "text-primary",
          },
          {
            label: "Refunds / waivers",
            value: `UGX ${((refundStats._sum.amount ?? 0) / 1_000_000).toFixed(1)}M`,
            sub:   `${refundStats._count._all} approved`,
            style: "text-danger",
          },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <p className={`text-xl font-bold ${s.style}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            <p className="text-xs text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue by payment method */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-sm">Revenue by payment method</h2>
        {revenueByMethod.length === 0 ? (
          <p className="text-xs text-gray-400">No confirmed payments in this period.</p>
        ) : (
          <div className="space-y-2">
            {revenueByMethod
              .sort((a, b) => (b._sum.amount ?? 0) - (a._sum.amount ?? 0))
              .map((m) => {
                const pct = confirmedRevenue > 0
                  ? Math.round(((m._sum.amount ?? 0) / confirmedRevenue) * 100)
                  : 0;
                return (
                  <div key={m.method}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{METHOD_LABEL[m.method] ?? m.method}</span>
                      <span className="font-semibold text-primary">
                        UGX {(m._sum.amount ?? 0).toLocaleString()}
                        <span className="text-gray-400 font-normal ml-2">({m._count._all} payments, {pct}%)</span>
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
              })}
          </div>
        )}
      </div>

      {/* Collected vs outstanding by enrolment phase */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-sm">Collected vs outstanding by payment phase</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 text-left border-b border-border">
                <th className="pb-1 pr-4 font-normal">Phase</th>
                <th className="pb-1 pr-4 font-normal">Students</th>
                <th className="pb-1 pr-4 font-normal">Total fees</th>
                <th className="pb-1 pr-4 font-normal">Collected</th>
                <th className="pb-1 font-normal">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {enrolmentFees
                .sort((a, b) => {
                  const order = ["ACTIVE","PARTIALLY_PAID","OVERDUE","PENDING_PAYMENT","COMPLETED","SUSPENDED","CANCELLED","REFUNDED"];
                  return order.indexOf(a.status) - order.indexOf(b.status);
                })
                .map((e) => {
                  const outstanding = (e._sum.totalAmountUgx ?? 0) - (e._sum.paidAmountUgx ?? 0);
                  return (
                    <tr key={e.status}>
                      <td className="py-1.5 pr-4 font-medium">
                        {ENROL_STATUS_LABEL[e.status] ?? e.status}
                      </td>
                      <td className="py-1.5 pr-4">{e._count._all}</td>
                      <td className="py-1.5 pr-4">UGX {(e._sum.totalAmountUgx ?? 0).toLocaleString()}</td>
                      <td className="py-1.5 pr-4 text-success font-medium">
                        UGX {(e._sum.paidAmountUgx ?? 0).toLocaleString()}
                      </td>
                      <td className={`py-1.5 font-medium ${outstanding > 0 ? "text-warning" : "text-gray-400"}`}>
                        {outstanding > 0 ? `UGX ${outstanding.toLocaleString()}` : "-"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
            <tfoot className="border-t-2 border-border">
              <tr>
                <td className="py-1.5 pr-4 font-semibold text-xs">Total</td>
                <td className="py-1.5 pr-4 font-semibold">
                  {enrolmentFees.reduce((a, e) => a + e._count._all, 0)}
                </td>
                <td className="py-1.5 pr-4 font-semibold">UGX {totalFees.toLocaleString()}</td>
                <td className="py-1.5 pr-4 font-semibold text-success">UGX {totalCollected.toLocaleString()}</td>
                <td className="py-1.5 font-semibold text-warning">
                  {outstanding > 0 ? `UGX ${outstanding.toLocaleString()}` : "-"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Monthly revenue */}
      {monthlyRevenue.length > 0 && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-sm">Revenue by month</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 text-left border-b border-border">
                  <th className="pb-1 pr-4 font-normal">Month</th>
                  <th className="pb-1 font-normal">Collected (UGX)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {monthlyRevenue.map((r) => {
                  const monthLabel = new Date(r.yr, r.mo - 1).toLocaleString("en-UG", { month: "long", year: "numeric" });
                  const amount = Number(r.total);
                  const maxAmount = Math.max(...monthlyRevenue.map((m) => Number(m.total)));
                  const pct = maxAmount > 0 ? Math.round((amount / maxAmount) * 100) : 0;
                  return (
                    <tr key={`${r.yr}-${r.mo}`}>
                      <td className="py-1.5 pr-4 font-medium">{monthLabel}</td>
                      <td className="py-1.5">
                        <div className="flex items-center gap-3">
                          <div className="h-2 bg-surface rounded-full overflow-hidden w-32 flex-shrink-0">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-semibold text-primary">{amount.toLocaleString()}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent decisions on finance approvals */}
      {recentApprovals.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Recent finance decisions</h2>
            <Link href="/director/finance/approvals" className="text-xs text-primary hover:underline no-underline">
              View all
            </Link>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 text-left border-b border-border">
                <th className="pb-1 pr-4 font-normal">Type</th>
                <th className="pb-1 pr-4 font-normal">From</th>
                <th className="pb-1 pr-4 font-normal">Amount</th>
                <th className="pb-1 pr-4 font-normal">Decision</th>
                <th className="pb-1 font-normal">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentApprovals.map((r) => (
                <tr key={r.id} className="hover:bg-surface/40">
                  <td className="py-1.5 pr-4">
                    <Link
                      href={`/director/approvals/${r.id}`}
                      className="text-primary hover:underline no-underline"
                    >
                      {TYPE_LABEL[r.type] ?? r.type}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-4 text-gray-500">{r.initiator.name}</td>
                  <td className="py-1.5 pr-4 font-medium">
                    {r.amount != null ? `UGX ${r.amount.toLocaleString()}` : "-"}
                  </td>
                  <td className="py-1.5 pr-4">
                    <span className={`badge text-xs ${APPROVAL_STYLE[r.status] ?? "badge-info"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-1.5 text-gray-400">
                    {r.decidedAt ? new Date(r.decidedAt).toLocaleDateString("en-UG") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent payments */}
      <div className="card overflow-x-auto space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Recent payments</h2>
          <Link href="/director/finance/payments" className="text-xs text-primary hover:underline no-underline">
            View all
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Student</th>
              <th className="pb-2 font-medium pr-4">Programme</th>
              <th className="pb-2 font-medium pr-4">Amount</th>
              <th className="pb-2 font-medium pr-4">Method</th>
              <th className="pb-2 font-medium pr-4">Phase</th>
              <th className="pb-2 font-medium pr-4">Status</th>
              <th className="pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recentPayments.map((p) => (
              <tr key={p.id} className="hover:bg-surface/40">
                <td className="py-2.5 pr-4 font-medium text-sm">
                  {p.enrolment?.user?.name ?? "N/A"}
                </td>
                <td className="py-2.5 pr-4 text-xs text-gray-500">{p.enrolment?.course?.title ?? "N/A"}</td>
                <td className="py-2.5 pr-4 font-semibold text-primary">
                  UGX {p.amount.toLocaleString()}
                </td>
                <td className="py-2.5 pr-4 text-xs text-gray-500">
                  {METHOD_LABEL[p.method] ?? p.method}
                </td>
                <td className="py-2.5 pr-4 text-xs text-gray-500">
                  {p.enrolment?.paidPercent != null ? `${p.enrolment.paidPercent}%` : "-"}
                </td>
                <td className="py-2.5 pr-4">
                  <span className={`badge text-xs ${STATUS_STYLE[p.status] ?? "badge-info"}`}>
                    {p.status.replace(/_/g, " ")}
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
          <p className="text-center text-gray-400 py-8 text-sm">No payments in this period.</p>
        )}
      </div>

      {/* Quick links */}
      <div className="flex gap-3 flex-wrap">
        <Link href="/director/finance/payments"  className="btn-outline text-sm no-underline">All payments</Link>
        <Link href="/director/finance/approvals" className="btn-outline text-sm no-underline">Finance approvals</Link>
        <Link href="/director/finance/ledger"    className="btn-outline text-sm no-underline">Ledger</Link>
      </div>
    </div>
  );
}
