import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";
export const dynamic = "force-dynamic";


export const metadata = { title: "Finance Approvals - Director" };

export default async function DirectorFinanceApprovalsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "approvals.decide")) redirect("/login");

  const FINANCE_TYPES = ["PAYMENT_PROOF", "FEE_CHANGE", "WAIVER", "REFUND"] as const;

  const [pending, historical] = await Promise.all([
    db.approvalRequest.findMany({
      where: { type: { in: [...FINANCE_TYPES] }, status: { in: ["SUBMITTED", "IN_REVIEW"] } },
      orderBy: { createdAt: "desc" },
      include: {
        initiator: { select: { name: true, role: true } },
        reviewer: { select: { name: true } },
      },
    }),
    db.approvalRequest.findMany({
      where: { type: { in: [...FINANCE_TYPES] }, status: { in: ["APPROVED", "REJECTED"] } },
      orderBy: { updatedAt: "desc" },
      take: 30,
      include: {
        initiator: { select: { name: true } },
        decidedBy: { select: { name: true } },
      },
    }),
  ]);

  const STATUS_STYLE: Record<string, string> = {
    SUBMITTED: "badge-warning",
    IN_REVIEW: "badge-info",
    APPROVED: "badge-success",
    REJECTED: "badge-danger",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Finance Approvals</h1>
          <p className="text-sm text-gray-500 mt-0.5">Payment proofs, fee changes, waivers, refunds</p>
        </div>
        <Link href="/director/finance" className="btn-ghost text-sm no-underline ml-auto">Back</Link>
      </div>

      <section>
        <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-3">
          Pending ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-400 text-sm">No pending finance approvals.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map((r) => (
              <Link
                key={r.id}
                href={`/director/approvals/${r.id}`}
                className="card flex items-start gap-4 hover:shadow-md transition-shadow no-underline block"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm text-primary">{r.type.replace(/_/g, " ")}</span>
                    <span className={`badge text-xs ${STATUS_STYLE[r.status] ?? "badge-info"}`}>
                      {r.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">{r.reason}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {r.initiator.name} &middot; {new Date(r.createdAt).toLocaleDateString("en-UG")}
                  </p>
                </div>
                {r.amount != null && (
                  <p className="font-bold text-primary flex-shrink-0 text-sm">
                    UGX {r.amount.toLocaleString()}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {historical.length > 0 && (
        <section>
          <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-3">Recent decisions</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-border">
                  <th className="pb-2 font-medium pr-4">Type</th>
                  <th className="pb-2 font-medium pr-4">From</th>
                  <th className="pb-2 font-medium pr-4">Amount</th>
                  <th className="pb-2 font-medium pr-4">Decision</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {historical.map((r) => (
                  <tr key={r.id} className="hover:bg-surface/40">
                    <td className="py-2 pr-4 text-xs">{r.type.replace(/_/g, " ")}</td>
                    <td className="py-2 pr-4 text-xs text-gray-500">{r.initiator.name}</td>
                    <td className="py-2 pr-4 text-xs font-semibold">
                      {r.amount != null ? `UGX ${r.amount.toLocaleString()}` : "-"}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`badge text-xs ${STATUS_STYLE[r.status] ?? "badge-info"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-gray-400">
                      {new Date(r.updatedAt).toLocaleDateString("en-UG")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
