import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import ApprovalForwardForm from "../ApprovalForwardForm";

interface Props { params: { id: string } }

const ACTIONABLE = new Set(["SUBMITTED", "IN_REVIEW"]);

// Types where the Principal is the FINAL approver (no Director step needed)
const PRINCIPAL_FINAL = new Set(["ADMISSION", "MARKS_CHANGE"]);

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED:  "Pending",
  IN_REVIEW:  "Forwarded to Director",
  APPROVED:   "Approved",
  APPLIED:    "Approved and applied",
  REJECTED:   "Rejected",
  EXPIRED:    "Expired",
  DRAFT:      "Draft",
};

export default async function PrincipalApprovalDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "approvals.view")) redirect("/dashboard");

  const request = await db.approvalRequest.findUnique({
    where: { id: params.id },
    include: {
      initiator: { select: { name: true, role: true, email: true } },
      decidedBy: { select: { name: true } },
      reviewer:  { select: { name: true } },
    },
  });

  if (!request) notFound();

  // Resolve linked entity names for context
  let studentName: string | null = null;
  let courseName:  string | null = null;

  if (request.studentId) {
    const s = await db.user.findUnique({ where: { id: request.studentId }, select: { name: true } });
    studentName = s?.name ?? null;
  }
  if (request.enrolmentId) {
    const e = await db.enrolment.findUnique({
      where: { id: request.enrolmentId },
      include: { course: { select: { title: true } } },
    });
    courseName = e?.course.title ?? null;
  }
  if (!courseName && request.courseId) {
    const c = await db.course.findUnique({ where: { id: request.courseId }, select: { title: true } });
    courseName = c?.title ?? null;
  }

  const isPrincipalFinal = PRINCIPAL_FINAL.has(request.type);
  const isActionable     = ACTIONABLE.has(request.status);
  const isDecided        = !isActionable;
  const isAlreadyForwarded = request.status === "IN_REVIEW";

  const statusIcon =
    request.status === "APPROVED" || request.status === "APPLIED" ? "✅" :
    request.status === "REJECTED" || request.status === "EXPIRED"  ? "❌" : "📋";

  return (
    <div className="max-w-2xl mx-auto">
      <a
        href="/principal/approvals-inbox"
        className="text-xs text-gray-400 hover:text-primary no-underline mb-4 inline-block"
      >
        &larr; Back to inbox
      </a>

      <div className="card">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl" aria-hidden="true">{statusIcon}</span>
          <div>
            <h1 className="text-xl font-bold">{request.type.replace(/_/g, " ")}</h1>
            <p className="text-xs text-gray-400">
              {new Date(request.createdAt).toLocaleString("en-UG")} &middot;{" "}
              {STATUS_LABEL[request.status] ?? request.status}
            </p>
          </div>
        </div>

        {/* Already forwarded notice */}
        {isAlreadyForwarded && !isPrincipalFinal && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4 text-sm text-blue-700">
            This request has been forwarded to the Director for a final decision.
            {request.reviewNote && (
              <p className="mt-1 text-xs">Your note: {request.reviewNote}</p>
            )}
          </div>
        )}

        {/* Decided notice */}
        {isDecided && !isAlreadyForwarded && (
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
              {STATUS_LABEL[request.status]} by {request.decidedBy?.name ?? "—"}
            </p>
            {request.decisionNote && (
              <p className="text-xs text-gray-600 mt-1">{request.decisionNote}</p>
            )}
          </div>
        )}

        {/* Reviewer note (when there is a prior reviewer) */}
        {request.reviewer && request.reviewer.name !== session.user.name && (
          <div className="rounded-xl px-4 py-3 mb-4 bg-blue-50 border border-blue-100 text-xs text-blue-700">
            Reviewed and forwarded by <strong>{request.reviewer.name}</strong>
            {request.reviewNote && <span>: {request.reviewNote}</span>}
          </div>
        )}

        {/* Summary */}
        <dl className="space-y-3 text-sm mb-6">
          <div className="flex justify-between">
            <dt className="text-gray-500">Requested by</dt>
            <dd className="font-medium">{request.initiator.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Role</dt>
            <dd>{request.initiator.role.replace(/_/g, " ")}</dd>
          </div>
          {studentName && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Student</dt>
              <dd className="font-medium">{studentName}</dd>
            </div>
          )}
          {courseName && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Course / Programme</dt>
              <dd>{courseName}</dd>
            </div>
          )}
          {request.amount != null && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Amount</dt>
              <dd className="font-bold text-primary">UGX {request.amount.toLocaleString()}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-gray-500">Action required</dt>
            <dd className="font-medium">
              {isPrincipalFinal ? "Your decision (Principal is final approver)" : "Review and forward to Director"}
            </dd>
          </div>
          <div className="pt-2 border-t border-border">
            <dt className="text-gray-500 mb-1">Reason</dt>
            <dd className="text-gray-700 whitespace-pre-wrap">{request.reason}</dd>
          </div>
        </dl>

        {/* Action form - only for actionable requests not yet forwarded (unless principal is final) */}
        {isActionable && (!isAlreadyForwarded || isPrincipalFinal) && (
          <ApprovalForwardForm
            requestId={request.id}
            initiatorId={request.initiatorId}
            currentUserId={session.user.id}
            canDecide={isPrincipalFinal}
          />
        )}
      </div>
    </div>
  );
}
