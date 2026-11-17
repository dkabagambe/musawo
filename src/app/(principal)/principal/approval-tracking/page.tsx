import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Clock } from "lucide-react";

export const metadata = { title: "Approval Tracking - Principal" };

import type { ApprovalRequestStatus } from "@prisma/client";
export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  SUBMITTED:  "badge-warning",
  IN_REVIEW:  "badge-info",
  APPROVED:   "badge-success",
  APPLIED:    "badge-success",
  REJECTED:   "badge-danger",
  EXPIRED:    "badge-danger",
};

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED:  "Submitted",
  IN_REVIEW:  "Director reviewing",
  APPROVED:   "Approved",
  APPLIED:    "Applied",
  REJECTED:   "Rejected",
  EXPIRED:    "Expired",
};

const TYPE_LABELS: Record<string, string> = {
  ACADEMIC_PROGRAMME_CHANGE: "Programme change",
  COURSE_CHANGE:             "Course change",
  RESULTS_PUBLICATION:       "Results publication",
  CERTIFICATE_ISSUANCE:      "Certificate issuance",
  PAYMENT_PROOF:             "Payment proof",
  EQUIPMENT_REQUEST:         "Equipment request",
  FEE_CHANGE:                "Fee change",
  WAIVER:                    "Fee waiver",
  REFUND:                    "Refund",
};

function ageDays(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

function ageLabel(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function ageClass(days: number): string {
  if (days >= 14) return "text-danger font-semibold";
  if (days >= 7)  return "text-amber-600 font-medium";
  return "text-gray-400";
}

interface Props {
  searchParams: { status?: string };
}

export default async function ApprovalTrackingPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "content.approve")) redirect("/login");

  const statusTab = searchParams.status ?? "PENDING";

  // Items the Principal submitted to the Director
  const statusFilter =
    statusTab === "ALL"     ? undefined :
    statusTab === "PENDING" ? { status: { in: ["SUBMITTED", "IN_REVIEW"] as ApprovalRequestStatus[] } } :
    statusTab === "DECIDED" ? { status: { in: ["APPROVED", "APPLIED", "REJECTED"] as ApprovalRequestStatus[] } } :
    { status: statusTab as ApprovalRequestStatus };

  const requests = await db.approvalRequest.findMany({
    where: {
      // Items forwarded by this Principal (they are the reviewer)
      reviewerId: session.user.id,
      ...statusFilter,
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      initiator:  { select: { name: true, role: true } },
      decidedBy:  { select: { name: true } },
      student:    { select: { name: true, studentNumber: true } },
      course:     { select: { title: true } },
    },
  });

  const pendingCount = await db.approvalRequest.count({
    where: {
      reviewerId: session.user.id,
      status:     { in: ["SUBMITTED", "IN_REVIEW"] },
    },
  });

  const decidedCount = await db.approvalRequest.count({
    where: {
      reviewerId: session.user.id,
      status:     { in: ["APPROVED", "APPLIED", "REJECTED"] },
    },
  });

  const TABS = [
    { label: `Waiting (${pendingCount})`, value: "PENDING" },
    { label: `Decided (${decidedCount})`, value: "DECIDED" },
    { label: "All",                       value: "ALL" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl mb-2">Approval Tracking</h1>
      <p className="text-sm text-gray-500 mb-6">
        Requests you forwarded to the Director, with current status and age.
      </p>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2 flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/principal/approval-tracking?status=${t.value}`}
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

      {requests.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-3xl mb-3" aria-hidden="true">
            {statusTab === "PENDING" ? "✅" : "📋"}
          </p>
          <p className="text-gray-500 text-sm">
            {statusTab === "PENDING"
              ? "Nothing waiting for the Director."
              : `No ${statusTab.toLowerCase()} requests.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const age = ageDays(r.updatedAt);
            const isPending = ["SUBMITTED", "IN_REVIEW"].includes(r.status);

            let title = TYPE_LABELS[r.type] ?? r.type.replace(/_/g, " ");
            if (r.student) {
              title += ` - ${r.student.name}`;
            } else if (r.course) {
              title += ` - ${r.course.title}`;
            }

            return (
              <div
                key={r.id}
                className="card flex items-start gap-4"
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
                  <p className="text-xs text-gray-500 line-clamp-2 mb-1">{r.reason}</p>
                  {r.reviewNote && (
                    <p className="text-xs text-gray-600 italic mb-1">
                      Your note: {r.reviewNote}
                    </p>
                  )}
                  {r.decisionNote && (
                    <p className="text-xs text-success mb-1">
                      Director: {r.decisionNote}
                    </p>
                  )}
                  <p className="text-xs mt-1">
                    <span className="text-gray-400">
                      Originally from {r.initiator.name}{" "}
                    </span>
                    <span className={isPending ? ageClass(age) : "text-gray-400"}>
                      • Forwarded {ageLabel(age)}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {r.amount != null && (
                    <p className="font-bold text-primary">
                      UGX {r.amount.toLocaleString()}
                    </p>
                  )}
                  {isPending && age >= 7 && (
                    <button
                      type="button"
                      disabled
                      className="btn-sm btn-outline flex items-center gap-1 opacity-50 cursor-not-allowed"
                      title="Remind feature coming soon"
                    >
                      <Clock className="w-3 h-3" />
                      Remind
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
