import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import PaymentProofForm from "./PaymentProofForm";
import Link from "next/link";
export const dynamic = "force-dynamic";

export const metadata = { title: "Payment Proofs - Admin" };

interface Props {
  searchParams: { tab?: string };
}

export default async function AdminPaymentProofsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "finance.proof.collect")) redirect("/403");

  const tab = searchParams.tab ?? "submit";

  // Get students with enrolments for proof submission
  const students = await db.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { name: "asc" },
    take: 200,
    include: {
      enrolments: {
        where: { status: "ACTIVE" },
        include: {
          course: { select: { id: true, title: true, fee: true } },
        },
      },
    },
  });

  // Get proof submissions by this admin
  const proofSubmissions = await db.approvalRequest.findMany({
    where: {
      type: "PAYMENT_PROOF",
      initiatorId: session.user.id,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      reviewer: { select: { name: true } },
    },
  });

  const TABS = [
    { value: "submit", label: "Submit Proof" },
    { value: "history", label: `Submission History (${proofSubmissions.length})` },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold">Payment Proofs</h1>
            <p className="text-sm text-gray-500 mt-1">
              Collect and submit student payment proofs for approval
            </p>
          </div>
          <Link
            href="/admin/payments"
            className="btn-outline text-sm no-underline flex-shrink-0"
          >
            View All Payments
          </Link>
        </div>
        <div className="mt-3 px-3 py-2 bg-info/10 border border-info/30 rounded-xl text-sm text-gray-700">
          <strong>Approval Chain:</strong> Admin → Principal → Director
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/payments/proofs?tab=${t.value}`}
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

      {tab === "submit" && (
        <div className="card">
          <h2 className="font-semibold text-base mb-4">Submit Payment Proof</h2>
          <PaymentProofForm
            students={students.map((s) => ({
              id: s.id,
              name: s.name,
              email: s.email,
              enrolments: s.enrolments.map((e) => ({
                id: e.id,
                courseId: e.course.id,
                courseTitle: e.course.title,
                courseFee: e.course.fee,
              })),
            }))}
          />
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-3">
          {proofSubmissions.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-3xl mb-3">📋</p>
              <p className="text-gray-500 text-sm">No proof submissions yet.</p>
            </div>
          ) : (
            proofSubmissions.map((req) => {
              const lines = req.reason.split("\n");
              const student = lines.find((l) => l.startsWith("Student:"))?.replace("Student: ", "") ?? "";
              const phase = lines.find((l) => l.startsWith("Phase:"))?.replace("Phase: ", "") ?? "";
              const txId = lines.find((l) => l.startsWith("Transaction ID:"))?.replace("Transaction ID: ", "") ?? "";

              return (
                <div key={req.id} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {req.status === "APPROVED" ? (
                        <span className="badge badge-success text-xs">Approved</span>
                      ) : req.status === "REJECTED" ? (
                        <span className="badge badge-danger text-xs">Rejected</span>
                      ) : req.status === "IN_REVIEW" ? (
                        <span className="badge badge-warning text-xs">In Review</span>
                      ) : (
                        <span className="badge badge-warning text-xs">Submitted</span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(req.createdAt).toLocaleDateString("en-UG")}
                      </span>
                    </div>
                    {req.reviewedAt && req.reviewer && (
                      <span className="text-xs text-gray-500">
                        Reviewed by {req.reviewer.name}
                      </span>
                    )}
                  </div>
                  <div className="text-sm space-y-1">
                    {student && <p><strong>Student:</strong> {student}</p>}
                    {phase && <p><strong>Phase:</strong> {phase}</p>}
                    {txId && <p className="font-mono text-xs text-gray-600">{txId}</p>}
                  </div>
                  {req.reviewerNotes && (
                    <div className="mt-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm">
                      <p className="text-xs text-gray-400 mb-1">Reviewer notes:</p>
                      <p className="text-gray-700 dark:text-gray-300">{req.reviewerNotes}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
