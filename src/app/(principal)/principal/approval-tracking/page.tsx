import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";
import type { ApprovalRequestStatus } from "@prisma/client";

export const metadata = { title: "Approval Tracking - Principal" };

const STATUS_BADGE: Record<string, string> = {
  SUBMITTED:  "badge-warning",
  IN_REVIEW:  "badge-info",
  APPROVED:   "badge-success",
  APPLIED:    "badge-success",
  REJECTED:   "badge-danger",
  EXPIRED:    "badge-danger",
  DRAFT:      "badge-info",
};

const STATUS_ICON: Record<string, string> = {
  SUBMITTED:  "🕐",
  IN_REVIEW:  "🔄",
  APPROVED:   "✅",
  APPLIED:    "✅",
  REJECTED:   "❌",
  EXPIRED:    "⏰",
  DRAFT:      "📝",
};

interface Props {
  searchParams: { status?: string };
}

export default async function ApprovalTrackingPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "approvals.view")) redirect("/dashboard");

  const tab = searchParams.status ?? "ACTIVE";

  const ACTIVE_STATUSES: ApprovalRequestStatus[] = ["SUBMITTED", "IN_REVIEW"];

  const where =
    tab === "ALL"    ? { initiatorId: session.user.id } :
    tab === "ACTIVE" ? { initiatorId: session.user.id, status: { in: ACTIVE_STATUSES } } :
    { initiatorId: session.user.id, status: tab as ApprovalRequestStatus };

  const requests = await db.approvalRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      decidedBy: { select: { name: true } },
      reviewer:  { select: { name: true } },
    },
  });

  const activeCount = await db.approvalRequest.count({
    where: { initiatorId: session.user.id, status: { in: ACTIVE_STATUSES } },
  });

  const TABS = [
    { label: `Awaiting decision (${activeCount})`, value: "ACTIVE" },
    { label: "Approved",                           value: "APPROVED" },
    { label: "Rejected",                           value: "REJECTED" },
    { label: "All",                                value: "ALL" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl mb-2">Approval Tracking</h1>
      <p className="text-sm text-gray-500 mb-6">
        Track the status of requests you have submitted for Director approval.
      </p>

      <div className="flex gap-2 mb-6 border-b border-border pb-2 flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/principal/approval-tracking?status=${t.value}`}
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
        <div className="card text-center py-10">
          <p className="text-3xl mb-3" aria-hidden="true">
            {tab === "ACTIVE" ? "🎉" : "📭"}
          </p>
          <p className="text-gray-500 text-sm">
            {tab === "ACTIVE"
              ? "No submissions awaiting a decision."
              : `No ${tab.toLowerCase()} requests found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="card flex items-start gap-4">
              <span className="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">
                {STATUS_ICON[r.status] ?? "📋"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="font-semibold text-sm">{r.type.replace(/_/g, " ")}</h2>
                  <span className={`badge text-xs ${STATUS_BADGE[r.status] ?? "badge-info"}`}>
                    {r.status.replace(/_/g, " ")}
                  </span>
                </div>

                <p className="text-xs text-gray-500 line-clamp-2">{r.reason}</p>

                {/* Status trail */}
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-400">
                    Submitted {new Date(r.createdAt).toLocaleString("en-UG")}
                  </p>
                  {r.reviewer && (
                    <p className="text-xs text-blue-600">
                      Reviewed by {r.reviewer.name}
                      {r.reviewedAt ? ` on ${new Date(r.reviewedAt).toLocaleString("en-UG")}` : ""}
                    </p>
                  )}
                  {r.decidedBy && r.decidedAt && (
                    <p className={`text-xs font-medium ${
                      r.status === "APPROVED" || r.status === "APPLIED"
                        ? "text-green-700"
                        : "text-danger"
                    }`}>
                      {r.status === "REJECTED" ? "Rejected" : "Approved"} by {r.decidedBy.name} on{" "}
                      {new Date(r.decidedAt).toLocaleString("en-UG")}
                    </p>
                  )}
                  {r.decisionNote && (
                    <p className="text-xs text-gray-500 italic">&ldquo;{r.decisionNote}&rdquo;</p>
                  )}
                </div>
              </div>
              {r.amount != null && (
                <p className="font-bold text-primary flex-shrink-0">
                  UGX {r.amount.toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
