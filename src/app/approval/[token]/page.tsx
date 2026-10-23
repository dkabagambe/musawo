import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { notFound } from "next/navigation";
import ApprovalDecisionForm from "./ApprovalDecisionForm";

interface Props {
  params: { token: string };
}

export const metadata = { title: "Approval Request" };

export default async function ApprovalLinkPage({ params }: Props) {
  const session = await auth();

  // Must be logged in with approval decision permission
  if (!session?.user) {
    redirect(`/login?callbackUrl=/approval/${params.token}`);
  }
  if (!can(session.user.role, "approvals.decide")) {
    redirect("/login?error=forbidden");
  }

  const request = await db.approvalRequest.findUnique({
    where: { approvalToken: params.token },
    include: {
      initiator: { select: { name: true, role: true, email: true } },
      decidedBy: { select: { name: true } },
    },
  });

  if (!request) notFound();

  const expired =
    request.approvalTokenExpires && request.approvalTokenExpires < new Date();

  // Get related entity details for the summary screen
  let studentName:   string | null = null;
  let courseName:    string | null = null;
  let paymentAmount: number | null = null;

  if (request.studentId) {
    const student = await db.user.findUnique({
      where: { id: request.studentId },
      select: { name: true },
    });
    studentName = student?.name ?? null;
  }
  if (request.enrolmentId) {
    const enrolment = await db.enrolment.findUnique({
      where: { id: request.enrolmentId },
      include: { course: { select: { title: true } } },
    });
    courseName = enrolment?.course.title ?? null;
  }
  if (request.paymentId) {
    const payment = await db.payment.findUnique({
      where: { id: request.paymentId },
      select: { amount: true },
    });
    paymentAmount = payment?.amount ?? null;
  }

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4 py-12">
      <div className="card max-w-xl w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl" aria-hidden="true">
            {request.status === "PENDING" ? "📋" : request.status === "APPROVED" ? "✅" : "❌"}
          </span>
          <div>
            <h1 className="text-xl font-bold">Approval Request</h1>
            <p className="text-xs text-gray-400">
              {request.type.replace(/_/g, " ")} · {new Date(request.createdAt).toLocaleString("en-UG")}
            </p>
          </div>
        </div>

        {/* Expired notice */}
        {expired && request.status === "PENDING" && (
          <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 mb-4">
            <p className="text-amber-800 text-sm font-medium">⚠️ This approval link has expired.</p>
            <p className="text-xs text-amber-700 mt-0.5">
              You can still approve from the <a href="/director/approvals" className="underline">approval inbox</a>.
            </p>
          </div>
        )}

        {/* Already decided */}
        {request.status !== "PENDING" && (
          <div className={`rounded-xl px-4 py-3 mb-4 ${
            request.status === "APPROVED"
              ? "bg-success/10 border border-success/20"
              : "bg-danger/10 border border-danger/20"
          }`}>
            <p className={`text-sm font-semibold ${request.status === "APPROVED" ? "text-green-800" : "text-danger"}`}>
              {request.status === "APPROVED" ? "✅ Approved" : "❌ Rejected"} by {request.decidedBy?.name}
            </p>
            <p className="text-xs text-gray-600 mt-1">{request.decisionNote}</p>
          </div>
        )}

        {/* Summary */}
        <dl className="space-y-3 text-sm mb-6">
          <div className="flex justify-between">
            <dt className="text-gray-500">Requested by</dt>
            <dd className="font-medium">{request.initiator.name} ({request.initiator.role})</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Type</dt>
            <dd className="font-medium">{request.type.replace(/_/g, " ")}</dd>
          </div>
          {studentName && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Student</dt>
              <dd className="font-medium">{studentName}</dd>
            </div>
          )}
          {courseName && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Course</dt>
              <dd className="font-medium">{courseName}</dd>
            </div>
          )}
          {(request.amount ?? paymentAmount) && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Amount</dt>
              <dd className="font-bold text-primary">
                UGX {(request.amount ?? paymentAmount!).toLocaleString()}
              </dd>
            </div>
          )}
          <div className="pt-2 border-t border-border">
            <dt className="text-gray-500 mb-1">Reason</dt>
            <dd className="text-gray-700 whitespace-pre-wrap">{request.reason}</dd>
          </div>
        </dl>

        {/* Decision form - only if PENDING and not expired */}
        {request.status === "PENDING" && !expired && (
          <ApprovalDecisionForm
            requestId={request.id}
            initiatorId={request.initiatorId}
            currentUserId={session.user.id}
          />
        )}
      </div>
    </main>
  );
}
