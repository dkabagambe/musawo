import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Finance Approvals - Director" };

interface Props {
  searchParams: { status?: string };
}

const FINANCE_TYPES = ["PAYMENT_PROOF", "FEE_CHANGE", "WAIVER", "REFUND"] as const;

const TYPE_LABEL: Record<string, string> = {
  PAYMENT_PROOF: "Payment proof",
  FEE_CHANGE:    "Fee change",
  WAIVER:        "Waiver",
  REFUND:        "Refund",
};

const STATUS_STYLE: Record<string, string> = {
  SUBMITTED: "badge-warning",
  IN_REVIEW: "badge-info",
  APPROVED:  "badge-success",
  APPLIED:   "badge-success",
  REJECTED:  "badge-danger",
};

export default async function DirectorFinanceApprovalsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "approvals.decide")) redirect("/login");

  const statusFilter = searchParams.status ?? "pending";

  const isPending = statusFilter === "pending";

  const [pending, historical] = await Promise.all([
    // Pending: always load
    db.approvalRequest.findMany({
      where: { type: { in: [...FINANCE_TYPES] }, status: { in: ["SUBMITTED", "IN_REVIEW"] } },
      orderBy: { createdAt: "asc" },
      include: {
        initiator: { select: { name: true, role: true } },
        reviewer:  { select: { name: true, role: true } },
      },
    }),
    // Historical: load when tab is "history"
    isPending ? Promise.resolve([]) :
    db.approvalRequest.findMany({
      where: {
        type:   { in: [...FINANCE_TYPES] },
        status: { in: ["APPROVED", "APPLIED", "REJECTED"] },
      },
      orderBy: { decidedAt: "desc" },
      take:    50,
      include: {
        initiator: { select: { name: true } },
        decidedBy: { select: { name: true } },
      },
    }),
  ]);

  // For PAYMENT_PROOF items, fetch the linked payment to show duplicate-check info
  const proofIds = pending
    .filter((r) => r.type === "PAYMENT_PROOF" && r.paymentId)
    .map((r) => r.paymentId as string);

  const payments = proofIds.length
    ? await db.payment.findMany({
        where: { id: { in: proofIds } },
        select: {
          id: true, amount: true, method: true,
          bankTransferRef: true, gatewayRef: true, fraudStrike: true,
          bankReceiptS3Key: true,
        },
      })
    : [];
  const paymentById: Record<string, typeof payments[0]> = {};
  for (const p of payments) paymentById[p.id] = p;

  // Duplicate tx-ID check: flag if another COMPLETED or PENDING_APPROVAL payment
  // shares the same gatewayRef / bankTransferRef
  const allRefs = payments
    .map((p) => p.bankTransferRef ?? p.gatewayRef)
    .filter(Boolean) as string[];
  const duplicateRefCounts: Record<string, number> = {};
  if (allRefs.length) {
    const dupeRows = await db.payment.groupBy({
      by:    ["bankTransferRef"],
      where: { bankTransferRef: { in: allRefs } },
      _count:{ id: true },
    });
    for (const row of dupeRows) {
      if (row.bankTransferRef) duplicateRefCounts[row.bankTransferRef] = row._count.id;
    }
  }

  function ageDays(d: Date) {
    return Math.floor((Date.now() - d.getTime()) / 86_400_000);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary">Finance Approvals</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Payment proofs, fee changes, waivers, refunds
          </p>
        </div>
        <Link href="/director/finance" className="btn-ghost text-sm no-underline ml-auto">
          Back to Finance
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: "pending", label: `Pending (${pending.length})` },
          { key: "history", label: "Recent decisions" },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/director/finance/approvals?status=${t.key}`}
            className={`px-4 py-2 text-sm no-underline rounded-t-lg ${
              statusFilter === t.key
                ? "text-primary font-semibold border-b-2 border-primary"
                : "text-gray-500 hover:text-primary"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Pending panel */}
      {isPending && (
        <>
          {pending.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-gray-400 text-sm">No pending finance approvals.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((r) => {
                const age = ageDays(r.createdAt);
                const pmt = r.paymentId ? paymentById[r.paymentId] : null;
                const ref = pmt?.bankTransferRef ?? pmt?.gatewayRef;
                const isDuplicate = ref ? (duplicateRefCounts[ref] ?? 0) > 1 : false;
                const hasProofImage = pmt?.bankReceiptS3Key != null;
                const METHOD_LABEL: Record<string, string> = {
                  MTN_MOMO:     "MTN MoMo",
                  AIRTEL_MONEY: "Airtel Money",
                  BANK_TRANSFER:"Bank transfer",
                  CARD:         "Card",
                };

                return (
                  <div
                    key={r.id}
                    className={`card border ${
                      isDuplicate || pmt?.fraudStrike
                        ? "border-danger/40 bg-danger/5"
                        : age >= 7
                        ? "border-danger/30"
                        : age >= 3
                        ? "border-warning/30"
                        : "border-border"
                    }`}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {TYPE_LABEL[r.type] ?? r.type}
                        </span>
                        <span className={`badge text-xs ${STATUS_STYLE[r.status]}`}>
                          {r.status === "IN_REVIEW" ? "In review" : "Waiting"}
                        </span>
                        {isDuplicate && (
                          <span className="badge text-xs badge-danger">Duplicate tx ID</span>
                        )}
                        {pmt?.fraudStrike && (
                          <span className="badge text-xs badge-danger">Fraud flag</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {r.amount != null && (
                          <span className="font-bold text-primary">
                            UGX {r.amount.toLocaleString()}
                          </span>
                        )}
                        <span className={`text-xs ${age >= 7 ? "text-danger font-semibold" : age >= 3 ? "text-amber-600" : "text-gray-400"}`}>
                          {age === 0 ? "Today" : age === 1 ? "1 day ago" : `${age} days ago`}
                        </span>
                        <Link
                          href={`/director/approvals/${r.id}`}
                          className="btn-primary text-xs px-3 py-1.5 no-underline"
                        >
                          Review and decide
                        </Link>
                      </div>
                    </div>

                    {/* Request detail */}
                    <p className="text-xs text-gray-600 mb-2 max-w-prose">{r.reason}</p>

                    {/* Payment proof details */}
                    {pmt && (
                      <div className="rounded-lg bg-surface p-3 text-xs space-y-1 mb-2">
                        <p className="font-medium text-gray-500 mb-1">Automatic checks</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
                          <span>
                            Method:{" "}
                            <span className="font-medium">{METHOD_LABEL[pmt.method] ?? pmt.method}</span>
                          </span>
                          {ref && (
                            <span>
                              Tx ref:{" "}
                              <span className="font-mono font-medium">{ref}</span>
                            </span>
                          )}
                          <span className={isDuplicate ? "text-danger font-semibold" : "text-success"}>
                            {isDuplicate ? "Duplicate tx ID detected" : "Tx ID unique"}
                          </span>
                          <span className={hasProofImage ? "text-success" : "text-warning"}>
                            {hasProofImage ? "Proof image attached" : "No proof image"}
                          </span>
                          {pmt.fraudStrike && (
                            <span className="text-danger font-semibold col-span-2">
                              Previously flagged for fraud
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Approval chain */}
                    <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                      <span>
                        {r.initiator.role.toLowerCase() === "admin" ? "Admin" : r.initiator.role}:{" "}
                        {r.initiator.name}
                      </span>
                      {r.reviewer && (
                        <>
                          <span>&rarr;</span>
                          <span>
                            {r.reviewer.role?.toLowerCase() === "principal" ? "Principal" : r.reviewer.role}:{" "}
                            {r.reviewer.name} (forwarded)
                          </span>
                        </>
                      )}
                      <span>&rarr;</span>
                      <span className="text-primary font-medium">Director (you)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* History tab */}
      {!isPending && (
        <>
          {historical.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-gray-400 text-sm">No decided finance approvals yet.</p>
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-border">
                    <th className="pb-2 font-medium pr-4">Type</th>
                    <th className="pb-2 font-medium pr-4">From</th>
                    <th className="pb-2 font-medium pr-4">Amount</th>
                    <th className="pb-2 font-medium pr-4">Decision</th>
                    <th className="pb-2 font-medium pr-4">By</th>
                    <th className="pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historical.map((r) => (
                    <tr key={r.id} className="hover:bg-surface/40">
                      <td className="py-2.5 pr-4">
                        <Link
                          href={`/director/approvals/${r.id}`}
                          className="text-primary hover:underline no-underline text-xs"
                        >
                          {TYPE_LABEL[r.type] ?? r.type}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-500">{r.initiator.name}</td>
                      <td className="py-2.5 pr-4 text-xs font-semibold">
                        {r.amount != null ? `UGX ${r.amount.toLocaleString()}` : "-"}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`badge text-xs ${STATUS_STYLE[r.status] ?? "badge-info"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-500">
                        {r.decidedBy?.name ?? "-"}
                      </td>
                      <td className="py-2.5 text-xs text-gray-400">
                        {r.decidedAt ? new Date(r.decidedAt).toLocaleDateString("en-UG") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
