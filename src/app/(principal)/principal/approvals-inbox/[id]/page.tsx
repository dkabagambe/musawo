import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import ApprovalDecisionForm from "./ApprovalDecisionForm";

export const metadata = { title: "Approval Detail - Principal" };
export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  ADMISSION:             "Student Admission",
  MARKS_CHANGE:          "Marks Change",
  PAYMENT_PROOF:         "Payment Proof",
  RESULTS_PUBLICATION:   "Results Publication",
  EQUIPMENT_REQUEST:     "Equipment Request",
  STORAGE_CLEARING:      "Storage Clearing",
  CERTIFICATE_ISSUANCE:  "Certificate Issuance",
};

const STATUS_BADGE: Record<string, string> = {
  SUBMITTED:  "badge-warning",
  IN_REVIEW:  "badge-info",
  APPROVED:   "badge-success",
  APPLIED:    "badge-success",
  REJECTED:   "badge-danger",
  EXPIRED:    "badge-danger",
};

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED:  "Awaiting review",
  IN_REVIEW:  "In review",
  APPROVED:   "Approved",
  APPLIED:    "Applied",
  REJECTED:   "Rejected",
  EXPIRED:    "Expired",
};

function ageDays(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Kampala",
  }).format(date);
}

interface Props {
  params: { id: string };
}

export default async function ApprovalDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "content.approve")) redirect("/login");

  const request = await db.approvalRequest.findUnique({
    where: { id: params.id },
    include: {
      initiator:  { select: { id: true, name: true, role: true, email: true } },
      reviewer:   { select: { name: true } },
      decidedBy:  { select: { name: true } },
      student:    { select: { id: true, name: true, studentNumber: true, email: true, phone: true, status: true } },
      course:     { select: { id: true, title: true, courseCode: true } },
      exam:       { select: { id: true, title: true } },
    },
  });

  if (!request) notFound();

  const age = ageDays(request.createdAt);
  const canDecide = ["SUBMITTED", "IN_REVIEW"].includes(request.status) && !request.decidedById;

  // Determine what actions are available for this type
  const typeConfig = getTypeConfig(request.type);

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/principal/approvals-inbox"
        className="inline-flex items-center gap-1 text-sm text-primary hover:text-accent no-underline mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to inbox
      </Link>

      <div className="card mb-6">
        {/* Header */}
        <div className="border-b border-border pb-4 mb-4">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h1 className="text-xl font-bold mb-1">
                {TYPE_LABELS[request.type] ?? request.type.replace(/_/g, " ")}
              </h1>
              <p className="text-xs text-gray-400">
                Request ID: {request.id.slice(0, 8)}
              </p>
            </div>
            <span className={`badge ${STATUS_BADGE[request.status] ?? "badge-info"}`}>
              {STATUS_LABEL[request.status] ?? request.status}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              From <strong>{request.initiator.name}</strong> ({request.initiator.role.replace(/_/g, " ")})
            </span>
            <span>•</span>
            <span>
              Submitted {formatDate(request.createdAt)} ({age === 0 ? "today" : `${age} day${age > 1 ? "s" : ""} ago`})
            </span>
          </div>
        </div>

        {/* Student details (if applicable) */}
        {request.student && (
          <div className="mb-4 p-3 bg-surface rounded-lg">
            <h3 className="font-semibold text-sm mb-2">Student Information</h3>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <dt className="text-gray-500">Name:</dt>
              <dd className="font-medium">{request.student.name}</dd>
              <dt className="text-gray-500">Student Number:</dt>
              <dd className="font-medium">{request.student.studentNumber}</dd>
              <dt className="text-gray-500">Email:</dt>
              <dd className="font-medium">{request.student.email}</dd>
              <dt className="text-gray-500">Phone:</dt>
              <dd className="font-medium">{request.student.phone ?? "N/A"}</dd>
              <dt className="text-gray-500">Status:</dt>
              <dd className="font-medium">{request.student.status}</dd>
            </dl>
          </div>
        )}

        {/* Course details (if applicable) */}
        {request.course && (
          <div className="mb-4 p-3 bg-surface rounded-lg">
            <h3 className="font-semibold text-sm mb-2">Course Information</h3>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <dt className="text-gray-500">Course:</dt>
              <dd className="font-medium">{request.course.title}</dd>
              <dt className="text-gray-500">Code:</dt>
              <dd className="font-medium">{request.course.courseCode ?? "N/A"}</dd>
            </dl>
          </div>
        )}

        {/* Amount (if applicable) */}
        {request.amount != null && (
          <div className="mb-4 p-3 bg-primary/5 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Amount</p>
            <p className="text-2xl font-bold text-primary">
              UGX {request.amount.toLocaleString()}
            </p>
          </div>
        )}

        {/* Reason */}
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-1">Reason / Details</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {request.reason}
          </p>
        </div>

        {/* Evidence link */}
        {request.evidence && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm mb-1">Supporting Document</h3>
            <a
              href={request.evidence}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent hover:underline"
            >
              View document →
            </a>
          </div>
        )}

        {/* Previous review note */}
        {request.reviewNote && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-sm mb-1">Your Review Note</h3>
            <p className="text-sm text-gray-600">{request.reviewNote}</p>
            {request.reviewedAt && (
              <p className="text-xs text-gray-400 mt-1">
                Reviewed {formatDate(request.reviewedAt)}
              </p>
            )}
          </div>
        )}

        {/* Decision note (if decided) */}
        {request.decisionNote && (
          <div className={`mb-4 p-3 rounded-lg border ${
            request.status === "APPROVED" || request.status === "APPLIED"
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
          }`}>
            <h3 className="font-semibold text-sm mb-1">Decision</h3>
            <p className="text-sm text-gray-600">{request.decisionNote}</p>
            {request.decidedAt && request.decidedBy && (
              <p className="text-xs text-gray-400 mt-1">
                By {request.decidedBy.name} on {formatDate(request.decidedAt)}
              </p>
            )}
          </div>
        )}

        {/* Type-specific guidance */}
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <h3 className="font-semibold text-sm mb-1">Guidance</h3>
          <p className="text-xs text-gray-600">
            {typeConfig.guidance}
          </p>
        </div>
      </div>

      {/* Decision form */}
      {canDecide && (
        <div className="card">
          <h2 className="font-bold text-lg mb-4">Your Decision</h2>
          <ApprovalDecisionForm
            requestId={request.id}
            requestType={request.type}
            actions={typeConfig.actions}
          />
        </div>
      )}
    </div>
  );
}

// Type-specific configuration for what actions are available
function getTypeConfig(type: string) {
  const configs: Record<string, { actions: string[]; guidance: string }> = {
    ADMISSION: {
      actions: ["APPROVE", "REJECT", "REQUEST_INFO"],
      guidance: "Review the applicant details, uploaded documents, and eligibility. For professional courses, verify professional title and registration number. Approve to create the student account and send login link. Reject with reason if ineligible. Request more information if documents are incomplete.",
    },
    MARKS_CHANGE: {
      actions: ["APPROVE", "REJECT"],
      guidance: "Review the requested marks change. You have final authority on marks changes after release. Approve if the correction is justified, or reject with reason.",
    },
    PAYMENT_PROOF: {
      actions: ["FORWARD", "RETURN"],
      guidance: "Review the proof, automatic checks (unique transaction ID, duplicate image, amount vs phase, time window). Forward to Director for final approval, or return to Admin with reason if issues are found.",
    },
    RESULTS_PUBLICATION: {
      actions: ["FORWARD", "SEND_BACK"],
      guidance: "Review marks, pass rate, distribution, missing marks and outliers. Send back to instructor with comment if corrections needed, or forward to Director for final approval.",
    },
    EQUIPMENT_REQUEST: {
      actions: ["APPROVE", "FORWARD"],
      guidance: "Review the equipment request prepared by Admin. You may approve directly, or forward to Director for decision (either of you may approve).",
    },
    STORAGE_CLEARING: {
      actions: ["CONFIRM"],
      guidance: "Confirm after reviewing the storage clearing preview. Director will be notified once you confirm.",
    },
    CERTIFICATE_ISSUANCE: {
      actions: ["FORWARD"],
      guidance: "Review the certificate list prepared by Admin. Forward to Director to request issuance.",
    },
  };

  return configs[type] ?? {
    actions: ["FORWARD", "REJECT"],
    guidance: "Review the request details carefully before making your decision.",
  };
}
