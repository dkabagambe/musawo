import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "Approval Inbox - Director" };

import type { ApprovalRequestStatus } from "@prisma/client";
export const dynamic = "force-dynamic";


const ACTIONABLE: ApprovalRequestStatus[] = ["SUBMITTED", "IN_REVIEW"];

const STATUS_BADGE: Record<string, string> = {
  SUBMITTED:  "badge-warning",
  IN_REVIEW:  "badge-info",
  APPROVED:   "badge-success",
  APPLIED:    "badge-success",
  REJECTED:   "badge-danger",
  EXPIRED:    "badge-danger",
  DRAFT:      "badge-info",
};

interface Props {
  searchParams: { status?: string };
}

export default async function ApprovalsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || can(session.user.role, "approvals.decide") === false) redirect("/login");

  const tab = searchParams.status ?? "PENDING";

  const where =
    tab === "ALL"     ? {} :
    tab === "PENDING" ? { status: { in: ACTIONABLE } } :
    { status: tab as ApprovalRequestStatus };

  const requests = await db.approvalRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      initiator: { select: { name: true, role: true } },
      decidedBy: { select: { name: true } },
      reviewer:  { select: { name: true } },
    },
  });

  const pendingCount = await db.approvalRequest.count({
    where: { status: { in: ACTIONABLE } },
  });

  const TABS = [
    { label: `Pending (${pendingCount})`, value: "PENDING" },
    { label: "Approved",                  value: "APPROVED" },
    { label: "Rejected",                  value: "REJECTED" },
    { label: "All",                       value: "ALL" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl mb-2">Approvals</h1>
      <p className="text-sm text-gray-500 mb-6">Requests requiring your decision</p>

      <div className="flex gap-2 mb-6 border-b border-border pb-2 flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/director/approvals?status=${t.value}`}
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
          <p className="text-3xl mb-3" aria-hidden="true">✅</p>
          <p className="text-gray-500 text-sm">No {tab.toLowerCase()} requests.</p>
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
                  <span className={`badge text-xs ${STATUS_BADGE[r.status] ?? "badge-info"}`}>
                    {r.status.replace(/_/g, " ")}
                  </span>
                  {r.reviewer && (
                    <span className="text-xs text-gray-400">via {r.reviewer.name}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{r.reason}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {r.initiator.name} ({r.initiator.role.replace(/_/g, " ")}) &middot;{" "}
                  {new Date(r.createdAt).toLocaleString("en-UG")}
                </p>
              </div>
              {r.amount != null && (
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
