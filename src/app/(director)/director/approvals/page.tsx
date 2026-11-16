import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "Approval Inbox - Director" };

import type { ApprovalRequestStatus, ApprovalRequestType } from "@prisma/client";
export const dynamic = "force-dynamic";

// Types the Director is authorised to decide
const DIRECTOR_TYPES: ApprovalRequestType[] = [
  "ACADEMIC_PROGRAMME_CHANGE",
  "COURSE_CHANGE",
  "RESULTS_PUBLICATION",
  "CERTIFICATE_ISSUANCE",
  "PAYMENT_PROOF",
  "EQUIPMENT_REQUEST",
  "ROLE_ASSIGNMENT",
  "FEE_CHANGE",
  "WAIVER",
  "REFUND",
];

const TYPE_LABELS: Record<string, string> = {
  ACADEMIC_PROGRAMME_CHANGE: "Programme change",
  COURSE_CHANGE:             "Course change",
  RESULTS_PUBLICATION:       "Results publication",
  CERTIFICATE_ISSUANCE:      "Certificate issuance",
  PAYMENT_PROOF:             "Payment proof",
  EQUIPMENT_REQUEST:         "Equipment request",
  ROLE_ASSIGNMENT:           "Role assignment",
  FEE_CHANGE:                "Fee change",
  WAIVER:                    "Fee waiver",
  REFUND:                    "Refund",
};

const STATUS_BADGE: Record<string, string> = {
  SUBMITTED:  "badge-warning",
  IN_REVIEW:  "badge-info",
  APPROVED:   "badge-success",
  APPLIED:    "badge-success",
  REJECTED:   "badge-danger",
  EXPIRED:    "badge-danger",
  DRAFT:      "badge-info",
};

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED:  "Waiting",
  IN_REVIEW:  "In review",
  APPROVED:   "Approved",
  APPLIED:    "Applied",
  REJECTED:   "Rejected",
  EXPIRED:    "Expired",
  DRAFT:      "Draft",
};

const ACTIONABLE: ApprovalRequestStatus[] = ["SUBMITTED", "IN_REVIEW"];

function ageDays(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

function ageLabel(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function ageClass(days: number): string {
  if (days >= 7)  return "text-danger font-semibold";
  if (days >= 3)  return "text-amber-600 font-medium";
  return "text-gray-400";
}

interface Props {
  searchParams: { status?: string };
}

export default async function ApprovalsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "approvals.decide")) redirect("/login");

  const tab = searchParams.status ?? "PENDING";

  const statusFilter =
    tab === "ALL"     ? undefined :
    tab === "PENDING" ? { status: { in: ACTIONABLE } } :
    { status: tab as ApprovalRequestStatus };

  const requests = await db.approvalRequest.findMany({
    where: {
      type: { in: DIRECTOR_TYPES },
      ...statusFilter,
    },
    // Pending: oldest first (most urgent at top). Others: newest first.
    orderBy: { createdAt: tab === "PENDING" ? "asc" : "desc" },
    take: 100,
    include: {
      initiator: { select: { name: true, role: true } },
      decidedBy: { select: { name: true } },
      reviewer:  { select: { name: true } },
    },
  });

  const pendingCount = await db.approvalRequest.count({
    where: {
      type:   { in: DIRECTOR_TYPES },
      status: { in: ACTIONABLE },
    },
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
      <p className="text-sm text-gray-500 mb-6">
        Requests requiring your decision, oldest first.
      </p>

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
          <p className="text-3xl mb-3" aria-hidden="true">
            {tab === "PENDING" ? "✅" : "📋"}
          </p>
          <p className="text-gray-500 text-sm">
            {tab === "PENDING"
              ? "All caught up. No pending requests."
              : `No ${tab.toLowerCase()} requests.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const age  = ageDays(r.createdAt);
            const isPending = ACTIONABLE.includes(r.status as ApprovalRequestStatus);
            return (
              <Link
                key={r.id}
                href={`/director/approvals/${r.id}`}
                className="card flex items-start gap-4 hover:shadow-md transition-shadow no-underline block"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="font-semibold text-sm">
                      {TYPE_LABELS[r.type] ?? r.type.replace(/_/g, " ")}
                    </h2>
                    <span className={`badge text-xs ${STATUS_BADGE[r.status] ?? "badge-info"}`}>
                      {STATUS_LABEL[r.status] ?? r.status.replace(/_/g, " ")}
                    </span>
                    {r.reviewer && (
                      <span className="text-xs text-gray-400">
                        via {r.reviewer.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{r.reason}</p>
                  <p className="text-xs mt-1">
                    <span className="text-gray-400">
                      {r.initiator.name} ({r.initiator.role.replace(/_/g, " ")}){" "}
                    </span>
                    <span className={isPending ? ageClass(age) : "text-gray-400"}>
                      {ageLabel(age)}
                    </span>
                  </p>
                </div>
                {r.amount != null && (
                  <p className="font-bold text-primary flex-shrink-0">
                    UGX {r.amount.toLocaleString()}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
