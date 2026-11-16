import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "All Payments - Director" };

interface Props {
  searchParams: { page?: string; status?: string; method?: string; q?: string };
}

export default async function DirectorFinancePaymentsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "payments.view")) redirect("/login");

  const page   = Math.max(1, Number(searchParams.page ?? 1));
  const take   = 40;
  const skip   = (page - 1) * take;
  const statusFilter = searchParams.status ?? "";
  const methodFilter = searchParams.method ?? "";
  const q      = searchParams.q?.trim() ?? "";

  const where: Record<string, unknown> = {};
  if (statusFilter) where.status = statusFilter;
  if (methodFilter) where.method = methodFilter;
  if (q) {
    where.enrolment = {
      user: { name: { contains: q, mode: "insensitive" } },
    };
  }

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: {
        id: true, amount: true, method: true, status: true,
        createdAt: true, paidAt: true,
        bankTransferRef: true, gatewayRef: true, fraudStrike: true,
        enrolment: {
          select: {
            id: true, status: true, paidPercent: true,
            user:   { select: { id: true, name: true, studentNumber: true } },
            course: { select: { title: true } },
          },
        },
      },
    }),
    db.payment.count({ where }),
  ]);

  const totalPages = Math.ceil(total / take);

  // Map payment IDs to their approval request (for linking to approval detail)
  const paymentIds = payments.map((p) => p.id);
  const paymentApprovals = await db.approvalRequest.findMany({
    where: { paymentId: { in: paymentIds } },
    select: { paymentId: true, id: true, status: true },
  });
  const approvalByPayment: Record<string, { id: string; status: string }> = {};
  for (const a of paymentApprovals) {
    if (a.paymentId) approvalByPayment[a.paymentId] = { id: a.id, status: a.status };
  }

  const STATUS_STYLE: Record<string, string> = {
    COMPLETED:        "badge-success",
    PENDING:          "badge-warning",
    PENDING_APPROVAL: "badge-warning",
    FAILED:           "badge-danger",
    REFUNDED:         "badge-info",
  };
  const METHOD_LABEL: Record<string, string> = {
    MTN_MOMO:     "MTN MoMo",
    AIRTEL_MONEY: "Airtel Money",
    BANK_TRANSFER:"Bank transfer",
    CARD:         "Card",
    MANUAL:       "Manual",
  };
  const STATUSES = ["", "COMPLETED", "PENDING", "PENDING_APPROVAL", "FAILED", "REFUNDED"];
  const METHODS  = ["", "MTN_MOMO", "AIRTEL_MONEY", "BANK_TRANSFER", "CARD", "MANUAL"];

  function qs(overrides: Record<string, string | number>) {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (methodFilter) params.set("method", methodFilter);
    if (q)            params.set("q",      q);
    for (const [k, v] of Object.entries(overrides)) {
      if (String(v)) params.set(k, String(v));
      else params.delete(k);
    }
    return `/director/finance/payments?${params.toString()}`;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary">All Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} transactions</p>
        </div>
        <div className="ml-auto flex gap-2">
          <a
            href={`/api/director/export/payments?status=${statusFilter}&method=${methodFilter}&q=${encodeURIComponent(q)}`}
            className="btn-secondary text-xs no-underline"
          >
            Export CSV
          </a>
          <Link href="/director/finance" className="btn-ghost text-sm no-underline">Back to Finance</Link>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search student name..."
          className="input text-sm max-w-xs"
        />
        <select name="status" defaultValue={statusFilter} className="input text-sm">
          {STATUSES.map((s) => (
            <option key={s || "ALL"} value={s}>{s || "All statuses"}</option>
          ))}
        </select>
        <select name="method" defaultValue={methodFilter} className="input text-sm">
          {METHODS.map((m) => (
            <option key={m || "ALL"} value={m}>{m ? (METHOD_LABEL[m] ?? m) : "All methods"}</option>
          ))}
        </select>
        <button type="submit" className="btn-secondary text-sm">Filter</button>
        {(statusFilter || methodFilter || q) && (
          <Link href="/director/finance/payments" className="btn-ghost text-sm no-underline">Clear</Link>
        )}
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Student</th>
              <th className="pb-2 font-medium pr-4">Programme</th>
              <th className="pb-2 font-medium pr-4">Amount</th>
              <th className="pb-2 font-medium pr-4">Method</th>
              <th className="pb-2 font-medium pr-4">Phase</th>
              <th className="pb-2 font-medium pr-4">Reference</th>
              <th className="pb-2 font-medium pr-4">Status</th>
              <th className="pb-2 font-medium pr-4">Approval</th>
              <th className="pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments.map((p) => {
              const apr = approvalByPayment[p.id];
              return (
                <tr key={p.id} className={`hover:bg-surface/40 ${p.fraudStrike ? "bg-danger/5" : ""}`}>
                  <td className="py-2.5 pr-4">
                    <Link
                      href={`/director/students/${p.enrolment.user.id}`}
                      className="font-medium text-primary hover:underline no-underline"
                    >
                      {p.enrolment.user.name}
                    </Link>
                    {p.fraudStrike && (
                      <span className="ml-1 badge text-xs badge-danger">Fraud flag</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">{p.enrolment.course.title}</td>
                  <td className="py-2.5 pr-4 font-semibold text-primary">
                    UGX {p.amount.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">
                    {METHOD_LABEL[p.method] ?? p.method}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">
                    {p.enrolment.paidPercent != null ? `${p.enrolment.paidPercent}%` : "-"}
                  </td>
                  <td className="py-2.5 pr-4 text-xs font-mono text-gray-400 max-w-[9rem] truncate">
                    {p.bankTransferRef ?? p.gatewayRef ?? "-"}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={`badge text-xs ${STATUS_STYLE[p.status] ?? "badge-info"}`}>
                      {p.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    {apr ? (
                      <Link
                        href={`/director/approvals/${apr.id}`}
                        className={`badge text-xs hover:underline no-underline ${
                          apr.status === "APPROVED" || apr.status === "APPLIED"
                            ? "badge-success"
                            : apr.status === "REJECTED"
                            ? "badge-danger"
                            : "badge-warning"
                        }`}
                      >
                        {apr.status}
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </td>
                  <td className="py-2.5 text-xs text-gray-400">
                    {new Date(p.createdAt).toLocaleDateString("en-UG")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {payments.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">No payments found.</p>
        )}
        {totalPages > 1 && (
          <div className="flex justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={qs({ page: page - 1 })} className="btn-outline text-xs px-3 py-1.5 no-underline">Previous</Link>
              )}
              {page < totalPages && (
                <Link href={qs({ page: page + 1 })} className="btn-primary text-xs px-3 py-1.5 no-underline">Next</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
