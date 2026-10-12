import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "Approval Inbox — Director" };

interface Props {
  searchParams: { status?: string };
}

export default async function ApprovalsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPERADMIN") redirect("/login");

  const status = searchParams.status ?? "PENDING";

  const requests = await db.approvalRequest.findMany({
    where: status !== "ALL" ? { status: status as never } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      initiator: { select: { name: true, role: true } },
      decidedBy: { select: { name: true } },
    },
  });

  const pendingCount = await db.approvalRequest.count({ where: { status: "PENDING" } });

  const TABS = [
    { label: `Pending (${pendingCount})`, value: "PENDING" },
    { label: "Approved",                  value: "APPROVED" },
    { label: "Rejected",                  value: "REJECTED" },
    { label: "All",                       value: "ALL" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl mb-6">Approval Inbox</h1>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/director/approvals?status=${t.value}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium no-underline transition-colors ${
              status === t.value
                ? "bg-primary text-white"
                : "text-gray-500 hover:bg-surface"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-3xl mb-3" aria-hidden="true">✅</p>
          <p className="text-gray-500 text-sm">No {status.toLowerCase()} requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Link
              key={r.id}
              href={`/director/approvals/${r.id}`}
              className="card flex items-start gap-4 hover:shadow-md transition-shadow no-underline block"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="font-semibold text-sm">{r.type.replace(/_/g, " ")}</h2>
                  <span className={`badge text-xs ${
                    r.status === "PENDING"  ? "badge-warning" :
                    r.status === "APPROVED" ? "badge-success" : "badge-danger"
                  }`}>{r.status}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{r.reason}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {r.initiator.name} ({r.initiator.role.replace("_"," ")}) ·{" "}
                  {new Date(r.createdAt).toLocaleString("en-UG")}
                </p>
              </div>
              {r.amount && (
                <p className="font-bold text-primary flex-shrink-0">
                  UGX {r.amount.toLocaleString()}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
