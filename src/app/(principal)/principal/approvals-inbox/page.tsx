import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import InboxFilters from "./InboxFilters";

export const metadata = { title: "Approvals Inbox - Principal" };

import type { ApprovalRequestStatus, ApprovalRequestType } from "@prisma/client";
export const dynamic = "force-dynamic";

// Types the Principal handles
const PRINCIPAL_TYPES: ApprovalRequestType[] = [
  "ADMISSION",              // Principal is final approver
  "MARKS_CHANGE",           // Principal decides alone
  "PAYMENT_PROOF",          // Principal reviews, forwards to Director
  "RESULTS_PUBLICATION",    // Principal reviews, forwards to Director
  "EQUIPMENT_REQUEST",      // Principal can approve or forward
  "STORAGE_CLEARING",       // Principal confirms
  "CERTIFICATE_ISSUANCE",   // Principal reviews, forwards to Director
];

const TYPE_LABELS: Record<string, string> = {
  ADMISSION:             "Student admission",
  MARKS_CHANGE:          "Marks change",
  PAYMENT_PROOF:         "Payment proof",
  RESULTS_PUBLICATION:   "Results publication",
  EQUIPMENT_REQUEST:     "Equipment request",
  STORAGE_CLEARING:      "Storage clearing",
  CERTIFICATE_ISSUANCE:  "Certificate issuance",
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
  SUBMITTED:  "Awaiting review",
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
  searchParams: { type?: string; status?: string; age?: string };
}

export default async function ApprovalsInboxPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "content.approve")) redirect("/login");

  const typeFilter = searchParams.type && PRINCIPAL_TYPES.includes(searchParams.type as ApprovalRequestType)
    ? searchParams.type as ApprovalRequestType
    : undefined;

  const statusTab = searchParams.status ?? "PENDING";
  
  const statusFilter =
    statusTab === "ALL"     ? undefined :
    statusTab === "PENDING" ? { status: { in: ACTIONABLE } } :
    { status: statusTab as ApprovalRequestStatus };

  const ageFilter = searchParams.age
    ? { createdAt: { lte: new Date(Date.now() - parseInt(searchParams.age) * 86_400_000) } }
    : undefined;

  const requests = await db.approvalRequest.findMany({
    where: {
      type: typeFilter ? typeFilter : { in: PRINCIPAL_TYPES },
      ...statusFilter,
      ...ageFilter,
      // Only show items awaiting Principal's decision (not yet forwarded to Director)
      decidedById: null,
    },
    // Pending: oldest first (most urgent at top). Others: newest first.
    orderBy: { createdAt: statusTab === "PENDING" ? "asc" : "desc" },
    take: 100,
    include: {
      initiator: { select: { name: true, role: true } },
      student:   { select: { name: true, studentNumber: true } },
      course:    { select: { title: true } },
      decidedBy: { select: { name: true } },
    },
  });

  const pendingCount = await db.approvalRequest.count({
    where: {
      type:        { in: PRINCIPAL_TYPES },
      status:      { in: ACTIONABLE },
      decidedById: null,
    },
  });

  const TABS = [
    { label: `Pending (${pendingCount})`, value: "PENDING" },
    { label: "Approved",                  value: "APPROVED" },
    { label: "Rejected",                  value: "REJECTED" },
    { label: "All",                       value: "ALL" },
  ];

  const TYPE_FILTERS = [
    { label: "All types", value: "" },
    ...PRINCIPAL_TYPES.map((t) => ({ label: TYPE_LABELS[t] ?? t, value: t })),
  ];

  const AGE_FILTERS = [
    { label: "Any age", value: "" },
    { label: "3+ days", value: "3" },
    { label: "7+ days", value: "7" },
    { label: "14+ days", value: "14" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl mb-2">Approvals Inbox</h1>
      <p className="text-sm text-gray-500 mb-6">
        Requests requiring your decision, oldest first.
      </p>

      {/* Status tabs */}
      <div className="flex gap-2 mb-4 border-b border-border pb-2 flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/principal/approvals-inbox?status=${t.value}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium no-underline transition-colors ${
              statusTab === t.value
                ? "bg-primary text-white"
                : "text-gray-500 hover:bg-surface"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Filters */}
      <InboxFilters
        typeFilters={TYPE_FILTERS}
        ageFilters={AGE_FILTERS}
        currentType={typeFilter}
        currentAge={searchParams.age}
      />

      {requests.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-3xl mb-3" aria-hidden="true">
            {statusTab === "PENDING" ? "✅" : "📋"}
          </p>
          <p className="text-gray-500 text-sm">
            {statusTab === "PENDING"
              ? "All caught up. No pending requests."
              : `No ${statusTab.toLowerCase()} requests.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const age  = ageDays(r.createdAt);
            const isPending = ACTIONABLE.includes(r.status as ApprovalRequestStatus);
            
            // Build a descriptive title
            let title = TYPE_LABELS[r.type] ?? r.type.replace(/_/g, " ");
            if (r.student) {
              title += ` - ${r.student.name}`;
            } else if (r.course) {
              title += ` - ${r.course.title}`;
            }

            return (
              <Link
                key={r.id}
                href={`/principal/approvals-inbox/${r.id}`}
                className="card flex items-start gap-4 hover:shadow-md transition-shadow no-underline block"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="font-semibold text-sm">
                      {title}
                    </h2>
                    <span className={`badge text-xs ${STATUS_BADGE[r.status] ?? "badge-info"}`}>
                      {STATUS_LABEL[r.status] ?? r.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  {r.student?.studentNumber && (
                    <p className="text-xs text-gray-400 mb-1">
                      Student #{r.student.studentNumber}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 line-clamp-2">{r.reason}</p>
                  <p className="text-xs mt-1">
                    <span className="text-gray-400">
                      From {r.initiator.name} ({r.initiator.role.replace(/_/g, " ")}){" "}
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
