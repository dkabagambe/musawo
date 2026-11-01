import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";

export const metadata = { title: "Finance - Principal" };

interface Props {
  searchParams: { tab?: string; page?: string };
}

export default async function PrincipalFinancePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "payments.view"))
    redirect("/403");

  const tab = searchParams.tab ?? "payment-proofs";
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 25;
  const skip = (page - 1) * take;

  // Payment proof approvals awaiting Principal review
  const paymentProofsPending = await db.approvalRequest.findMany({
    where: { type: "PAYMENT_PROOF", status: { in: ["SUBMITTED", "IN_REVIEW"] } },
    orderBy: { createdAt: "desc" },
    take,
    skip,
    include: {
      initiator: { select: { name: true } },
      reviewer: { select: { name: true } },
    },
  });
  const paymentProofsTotal = await db.approvalRequest.count({
    where: { type: "PAYMENT_PROOF", status: { in: ["SUBMITTED", "IN_REVIEW"] } },
  });

  // All payments summary
  const paymentStats = await db.payment.groupBy({
    by: ["status"],
    _count: { _all: true },
    _sum: { amount: true },
  });

  const recentPayments = await db.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      enrolment: {
        include: {
          user: { select: { name: true, studentNumber: true } },
          course: { select: { title: true } },
        },
      },
    },
  });

  // Fee change / waiver approvals pending
  const feeApprovals = await db.approvalRequest.findMany({
    where: {
      type: { in: ["FEE_CHANGE", "WAIVER", "REFUND"] },
      status: { in: ["SUBMITTED", "IN_REVIEW"] },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      initiator: { select: { name: true } },
    },
  });

  const TABS = [
    { value: "payment-proofs", label: `Payment Proofs (${paymentProofsTotal})` },
    { value: "payments",       label: "All Payments" },
    { value: "fee-approvals",  label: `Fee Requests (${feeApprovals.length})` },
  ];

  const statusColors: Record<string, string> = {
    COMPLETED:        "badge-success",
    PENDING:          "badge-warning",
    PENDING_APPROVAL: "badge-warning",
    FAILED:           "badge-danger",
    REFUNDED:         "badge-info",
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Finance</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review payment proofs, fee requests and forwarding to Director
        </p>
      </div>

      {/* Payment stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {paymentStats.map((s) => (
          <div key={s.status} className="card py-3 px-4 text-center">
            <p className="text-lg font-bold text-primary">{s._count._all}</p>
            <p className="text-xs text-gray-500">{s.status.replace(/_/g, " ")}</p>
            {s._sum.amount && (
              <p className="text-xs text-gray-400 font-mono">
                UGX {s._sum.amount.toLocaleString()}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 border-b border-border pb-2 flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/principal/finance?tab=${t.value}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium no-underline transition-colors ${
              tab === t.value
                ? "bg-primary text-white"
                : "text-gray-500 hover:bg-surface"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "payment-proofs" && (
        <>
          {paymentProofsPending.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-3xl mb-3">✅</p>
              <p className="text-gray-500 text-sm">No payment proofs awaiting review.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentProofsPending.map((r) => (
                <Link
                  key={r.id}
                  href={`/principal/approvals-inbox/${r.id}`}
                  className="card block hover:shadow-md transition-shadow no-underline"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge badge-warning text-xs">
                          {r.status === "IN_REVIEW" ? "Forwarded to Director" : "Awaiting your review"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{r.reason}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Submitted by {r.initiator.name} on{" "}
                        {new Date(r.createdAt).toLocaleDateString("en-UG")}
                      </p>
                    </div>
                    <span className="text-xs text-accent flex-shrink-0">Review &rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "payments" && (
        <div className="card overflow-x-auto">
          {recentPayments.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">No payments recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-border">
                  <th className="pb-2 font-medium pr-4">Student</th>
                  <th className="pb-2 font-medium pr-4">Course</th>
                  <th className="pb-2 font-medium pr-4 text-right">Amount</th>
                  <th className="pb-2 font-medium pr-4">Method</th>
                  <th className="pb-2 font-medium pr-4">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 pr-4">
                      <p className="font-medium">{p.enrolment.user.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{p.enrolment.user.studentNumber ?? "-"}</p>
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500">{p.enrolment.course.title}</td>
                    <td className="py-2.5 pr-4 font-medium text-right">
                      UGX {p.amount.toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500">{p.method.replace(/_/g, " ")}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`badge text-xs ${statusColors[p.status] ?? "badge-info"}`}>
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
          )}
        </div>
      )}

      {tab === "fee-approvals" && (
        <>
          {feeApprovals.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-3xl mb-3">✅</p>
              <p className="text-gray-500 text-sm">No fee change or waiver requests pending.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {feeApprovals.map((r) => (
                <Link
                  key={r.id}
                  href={`/principal/approvals-inbox/${r.id}`}
                  className="card block hover:shadow-md transition-shadow no-underline"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-600">
                          {r.type.replace(/_/g, " ")}
                        </span>
                        <span className="badge badge-warning text-xs">{r.status.replace(/_/g, " ")}</span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{r.reason}</p>
                      {r.amount != null && (
                        <p className="text-xs font-bold text-primary mt-1">
                          UGX {r.amount.toLocaleString()}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        from {r.initiator.name} &middot; {new Date(r.createdAt).toLocaleDateString("en-UG")}
                      </p>
                    </div>
                    <span className="text-xs text-accent flex-shrink-0">Review &rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
