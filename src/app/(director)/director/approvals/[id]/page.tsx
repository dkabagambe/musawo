import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import ApprovalDecisionForm from "@/app/approval/[token]/ApprovalDecisionForm";

interface Props { params: { id: string } }

export default async function ApprovalDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPERADMIN") redirect("/login");

  const request = await db.approvalRequest.findUnique({
    where: { id: params.id },
    include: {
      initiator: { select: { name: true, role: true, email: true } },
      decidedBy: { select: { name: true } },
    },
  });

  if (!request) notFound();

  let studentName:   string | null = null;
  let courseName:    string | null = null;

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

  return (
    <div className="max-w-2xl mx-auto">
      <a href="/director/approvals" className="text-xs text-gray-400 hover:text-primary no-underline mb-4 inline-block">
        ← Back to inbox
      </a>

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl" aria-hidden="true">📋</span>
          <div>
            <h1 className="text-xl font-bold">{request.type.replace(/_/g, " ")}</h1>
            <p className="text-xs text-gray-400">{new Date(request.createdAt).toLocaleString("en-UG")}</p>
          </div>
        </div>

        {request.status !== "PENDING" && (
          <div className={`rounded-xl px-4 py-3 mb-6 ${
            request.status === "APPROVED"
              ? "bg-success/10 border border-success/20"
              : "bg-danger/10 border border-danger/20"
          }`}>
            <p className={`font-semibold text-sm ${request.status === "APPROVED" ? "text-green-800" : "text-danger"}`}>
              {request.status === "APPROVED" ? "✅ Approved" : "❌ Rejected"} by {request.decidedBy?.name}
            </p>
            {request.decisionNote && <p className="text-xs text-gray-600 mt-1">{request.decisionNote}</p>}
          </div>
        )}

        <dl className="space-y-3 text-sm mb-6">
          <div className="flex justify-between"><dt className="text-gray-500">Requested by</dt><dd className="font-medium">{request.initiator.name}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Role</dt><dd>{request.initiator.role.replace("_"," ")}</dd></div>
          {studentName && <div className="flex justify-between"><dt className="text-gray-500">Student</dt><dd className="font-medium">{studentName}</dd></div>}
          {courseName && <div className="flex justify-between"><dt className="text-gray-500">Course</dt><dd>{courseName}</dd></div>}
          {request.amount && <div className="flex justify-between"><dt className="text-gray-500">Amount</dt><dd className="font-bold text-primary">UGX {request.amount.toLocaleString()}</dd></div>}
          <div className="pt-2 border-t border-border">
            <dt className="text-gray-500 mb-1">Reason</dt>
            <dd className="text-gray-700 whitespace-pre-wrap">{request.reason}</dd>
          </div>
        </dl>

        {request.status === "PENDING" && (
          <ApprovalDecisionForm
            requestId={request.id}
            initiatorId={request.initiatorId}
            currentUserId={session.user.id}
          />
        )}
      </div>
    </div>
  );
}
