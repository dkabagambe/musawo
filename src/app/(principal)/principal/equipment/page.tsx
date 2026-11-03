import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";
import ApprovalDecisionForm from "@/app/approval/[token]/ApprovalDecisionForm";
export const dynamic = "force-dynamic";


export const metadata = { title: "Equipment - Principal" };

const STATUS_BADGE: Record<string, string> = {
  SUBMITTED: "badge-warning",
  IN_REVIEW: "badge-info",
  APPROVED:  "badge-success",
  APPLIED:   "badge-success",
  REJECTED:  "badge-danger",
  DRAFT:     "badge-info",
  EXPIRED:   "badge-danger",
};

interface Props {
  searchParams: { status?: string };
}

export default async function PrincipalEquipmentPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "equipment.manage"))
    redirect("/403");

  const tab = searchParams.status ?? "PENDING";

  const ACTIONABLE = ["SUBMITTED", "IN_REVIEW"] as const;

  const where: Record<string, unknown> = { type: "EQUIPMENT_REQUEST" };
  if (tab === "PENDING") where.status = { in: [...ACTIONABLE] };
  else if (tab !== "ALL") where.status = tab;

  const [requests, pendingCount] = await Promise.all([
    db.approvalRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        initiator: { select: { name: true, role: true } },
        decidedBy: { select: { name: true } },
      },
    }),
    db.approvalRequest.count({
      where: { type: "EQUIPMENT_REQUEST", status: { in: [...ACTIONABLE] } },
    }),
  ]);

  const TABS = [
    { value: "PENDING",  label: `Pending (${pendingCount})` },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
    { value: "ALL",      label: "All" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Equipment Requests</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review and approve practical equipment requests submitted by the Admin
        </p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border pb-2 flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/principal/equipment?status=${t.value}`}
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

      {requests.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3" aria-hidden="true">
            {tab === "PENDING" ? "✅" : "📭"}
          </p>
          <p className="text-gray-500 text-sm">
            {tab === "PENDING"
              ? "No pending equipment requests."
              : `No ${tab.toLowerCase()} equipment requests.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const isActionable = ACTIONABLE.includes(r.status as "SUBMITTED" | "IN_REVIEW");
            return (
              <div key={r.id} className="card">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge text-xs ${STATUS_BADGE[r.status] ?? "badge-info"}`}>
                        {r.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-gray-400">
                        from {r.initiator.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleString("en-UG")}
                    </p>
                  </div>
                  {r.decidedBy && (
                    <span className="text-xs text-gray-400">
                      {r.status === "APPROVED" ? "Approved" : "Rejected"} by {r.decidedBy.name}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">{r.reason}</p>
                {isActionable && r.initiatorId !== session.user.id && (
                  <div className="border-t border-border pt-4">
                    <ApprovalDecisionForm
                      requestId={r.id}
                      initiatorId={r.initiatorId}
                      currentUserId={session.user.id}
                    />
                  </div>
                )}
                {isActionable && r.initiatorId === session.user.id && (
                  <p className="text-xs text-amber-700 bg-warning/10 px-3 py-2 rounded-xl">
                    You cannot approve your own request.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
