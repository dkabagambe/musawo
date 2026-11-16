import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import DirectorDecisionForm from "./DirectorDecisionForm";
import type { ApprovalRequestType } from "@prisma/client";

export const dynamic = "force-dynamic";

interface Props { params: { id: string } }

const ACTIONABLE = new Set(["SUBMITTED", "IN_REVIEW"]);

// Types the Director is authorised to decide
const DIRECTOR_TYPES = new Set<ApprovalRequestType>([
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
]);

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

const TYPE_ICON: Record<string, string> = {
  ACADEMIC_PROGRAMME_CHANGE: "🎓",
  COURSE_CHANGE:             "📚",
  RESULTS_PUBLICATION:       "📊",
  CERTIFICATE_ISSUANCE:      "🏅",
  PAYMENT_PROOF:             "💳",
  EQUIPMENT_REQUEST:         "🔧",
  ROLE_ASSIGNMENT:           "👤",
  FEE_CHANGE:                "💰",
  WAIVER:                    "✂️",
  REFUND:                    "↩️",
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

// High-risk types require TOTP re-auth before decision
const HIGH_RISK = new Set([
  "PAYMENT_PROOF", "FEE_CHANGE", "WAIVER", "REFUND",
  "ROLE_ASSIGNMENT", "RESULTS_PUBLICATION", "CERTIFICATE_ISSUANCE",
]);

function ageDays(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

export default async function ApprovalDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "approvals.decide")) redirect("/login");

  const request = await db.approvalRequest.findUnique({
    where: { id: params.id },
    include: {
      initiator: { select: { name: true, role: true, email: true } },
      decidedBy: { select: { name: true } },
      reviewer:  { select: { name: true } },
    },
  });

  if (!request) notFound();

  // Director should only decide types within their authority
  const isDirectorType = DIRECTOR_TYPES.has(request.type);

  let studentName: string | null = null;
  let courseName:  string | null = null;

  if (request.studentId) {
    const s = await db.user.findUnique({
      where: { id: request.studentId },
      select: { name: true, studentNumber: true },
    });
    studentName = s ? `${s.name}${s.studentNumber ? ` (${s.studentNumber})` : ""}` : null;
  }
  if (request.enrolmentId) {
    const e = await db.enrolment.findUnique({
      where:   { id: request.enrolmentId },
      include: { course: { select: { title: true } } },
    });
    courseName = e?.course.title ?? null;
  }
  if (!courseName && request.courseId) {
    const c = await db.course.findUnique({
      where:  { id: request.courseId },
      select: { title: true },
    });
    courseName = c?.title ?? null;
  }

  const decided   = !ACTIONABLE.has(request.status);
  const typeLabel = TYPE_LABELS[request.type] ?? request.type.replace(/_/g, " ");
  const typeIcon  = TYPE_ICON[request.type] ?? "📋";
  const age       = ageDays(request.createdAt);
  const isHighRisk = HIGH_RISK.has(request.type);

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/director/approvals"
        className="text-xs text-gray-400 hover:text-primary no-underline mb-4 inline-block"
      >
        &larr; Back to inbox
      </Link>

      <div className="card">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl" aria-hidden="true">{typeIcon}</span>
          <div>
            <h1 className="text-xl font-bold">{typeLabel}</h1>
            <p className="text-xs text-gray-400">
              {new Date(request.createdAt).toLocaleString("en-UG", { timeZone: "Africa/Kampala" })}
              {age > 0 && (
                <span className={age >= 7 ? " text-danger font-semibold" : age >= 3 ? " text-amber-600" : " text-gray-400"}>
                  {" "}({age === 1 ? "1 day ago" : `${age} days ago`})
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Not a Director type warning */}
        {!isDirectorType && (
          <div className="rounded-xl px-4 py-3 mb-4 bg-warning/10 border border-warning/30 text-xs text-amber-800">
            This request type is not normally decided by the Director. Proceed only if specifically required.
          </div>
        )}

        {/* High-risk warning for actionable items */}
        {!decided && isHighRisk && (
          <div className="rounded-xl px-4 py-3 mb-4 bg-blue-50 border border-blue-100 text-xs text-blue-800">
            This is a high-risk action. Your authenticator code (2FA) will be required to confirm the decision.
          </div>
        )}

        {/* Decided banner */}
        {decided && (
          <div className={`rounded-xl px-4 py-3 mb-6 ${
            request.status === "APPROVED" || request.status === "APPLIED"
              ? "bg-success/10 border border-success/20"
              : "bg-danger/10 border border-danger/20"
          }`}>
            <p className={`font-semibold text-sm ${
              request.status === "APPROVED" || request.status === "APPLIED"
                ? "text-green-800"
                : "text-danger"
            }`}>
              {STATUS_LABEL[request.status] ?? request.status} by{" "}
              {request.decidedBy?.name ?? "System"}
              {request.decidedAt && (
                <span className="font-normal text-xs text-gray-500 ml-2">
                  {new Date(request.decidedAt).toLocaleString("en-UG", { timeZone: "Africa/Kampala" })}
                </span>
              )}
            </p>
            {request.decisionNote && (
              <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{request.decisionNote}</p>
            )}
          </div>
        )}

        {/* Reviewer chain */}
        {request.reviewer && (
          <div className="rounded-xl px-4 py-3 mb-4 bg-blue-50 border border-blue-100 text-xs text-blue-700">
            Reviewed and forwarded by <strong>{request.reviewer.name}</strong>
            {request.reviewedAt && (
              <span className="text-blue-500 ml-1">
                on {new Date(request.reviewedAt).toLocaleDateString("en-UG", { timeZone: "Africa/Kampala" })}
              </span>
            )}
            {request.reviewNote && <span>: {request.reviewNote}</span>}
          </div>
        )}

        {/* Request details */}
        <dl className="space-y-3 text-sm mb-6">
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500 flex-shrink-0">Requested by</dt>
            <dd className="font-medium text-right">{request.initiator.name}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500 flex-shrink-0">Role</dt>
            <dd className="text-right">{request.initiator.role.replace(/_/g, " ")}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500 flex-shrink-0">Status</dt>
            <dd className="font-medium text-right">{STATUS_LABEL[request.status] ?? request.status}</dd>
          </div>
          {studentName && (
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500 flex-shrink-0">Student</dt>
              <dd className="font-medium text-right">{studentName}</dd>
            </div>
          )}
          {courseName && (
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500 flex-shrink-0">Course / Programme</dt>
              <dd className="text-right">{courseName}</dd>
            </div>
          )}
          {request.amount != null && (
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500 flex-shrink-0">Amount</dt>
              <dd className="font-bold text-primary text-right">
                UGX {request.amount.toLocaleString()}
              </dd>
            </div>
          )}
          <div className="pt-2 border-t border-border">
            <dt className="text-gray-500 mb-1">Reason / details</dt>
            <dd className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
              {request.reason}
            </dd>
          </div>
          {request.evidence && (
            <div className="pt-2 border-t border-border">
              <dt className="text-gray-500 mb-1">Supporting evidence</dt>
              <dd>
                <a
                  href={
                    request.evidence.startsWith("http")
                      ? request.evidence
                      : `/api/files/${encodeURIComponent(request.evidence)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent text-sm underline"
                >
                  View document
                </a>
              </dd>
            </div>
          )}
        </dl>

        {/* Decision form (only for actionable, Director-authority requests) */}
        {ACTIONABLE.has(request.status) && (
          <DirectorDecisionForm
            requestId={request.id}
            initiatorId={request.initiatorId}
            currentUserId={session.user.id}
          />
        )}
      </div>
    </div>
  );
}
