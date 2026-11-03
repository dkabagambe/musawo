import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";
import ResultsPublicationForm from "./ResultsPublicationForm";
export const dynamic = "force-dynamic";


export const metadata = { title: "Results - Admin" };

interface Props {
  searchParams: { tab?: string };
}

export default async function AdminResultsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "exams.mark")) redirect("/403");

  const tab = searchParams.tab ?? "pending";

  const [pendingAttempts, pendingPublicationApprovals] = await Promise.all([
    db.examAttempt.findMany({
      where: { status: "SUBMITTED" },
      orderBy: { submittedAt: "desc" },
      take: 30,
      include: {
        user: { select: { name: true, studentNumber: true } },
        exam: {
          select: {
            id: true,
            title: true,
            passPercent: true,
            course: { select: { title: true } },
          },
        },
      },
    }),
    db.approvalRequest.findMany({
      where: { type: "RESULTS_PUBLICATION", status: { in: ["SUBMITTED", "IN_REVIEW"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { initiator: { select: { name: true } } },
    }),
  ]);

  const TABS = [
    { value: "pending",   label: `Pending Results (${pendingAttempts.length})` },
    { value: "approvals", label: `Publication Requests (${pendingPublicationApprovals.length})` },
    { value: "submit",    label: "Submit for Publication" },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Results &amp; Grading</h1>
        <p className="text-sm text-gray-500 mt-1">
          Process submitted exam results and request publication
        </p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border pb-2 flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/results?tab=${t.value}`}
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

      {tab === "pending" && (
        <>
          {pendingAttempts.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-3xl mb-3">✅</p>
              <p className="text-gray-500 text-sm">No exam results pending processing.</p>
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-border">
                    <th className="pb-2 font-medium pr-4">Student</th>
                    <th className="pb-2 font-medium pr-4">Exam</th>
                    <th className="pb-2 font-medium pr-4">Course</th>
                    <th className="pb-2 font-medium pr-4 text-center">Score</th>
                    <th className="pb-2 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pendingAttempts.map((a) => {
                    const pct = a.maxScore ? Math.round(((a.score ?? 0) / a.maxScore) * 100) : null;
                    return (
                      <tr key={a.id}>
                        <td className="py-2.5 pr-4">
                          <p className="font-medium">{a.user.name}</p>
                          <p className="text-xs font-mono text-gray-400">{a.user.studentNumber ?? "-"}</p>
                        </td>
                        <td className="py-2.5 pr-4 text-sm">{a.exam.title}</td>
                        <td className="py-2.5 pr-4 text-xs text-gray-500">{a.exam.course.title}</td>
                        <td className="py-2.5 pr-4 text-center font-medium">
                          {pct !== null ? `${pct}%` : "-"}
                        </td>
                        <td className="py-2.5 text-xs text-gray-400">
                          {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString("en-UG") : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "approvals" && (
        <>
          {pendingPublicationApprovals.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-3xl mb-3">✅</p>
              <p className="text-gray-500 text-sm">No publication requests pending.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPublicationApprovals.map((r) => (
                <div key={r.id} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="badge badge-warning text-xs">{r.status.replace(/_/g, " ")}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString("en-UG")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.reason}</p>
                  <p className="text-xs text-gray-400 mt-1">Submitted by {r.initiator.name}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "submit" && (
        <ResultsPublicationForm
          examsWithResults={pendingAttempts.map((a) => ({
            examId: a.exam.id,
            examTitle: a.exam.title,
            courseName: a.exam.course.title,
          })).filter((v, i, arr) => arr.findIndex((x) => x.examId === v.examId) === i)}
        />
      )}
    </div>
  );
}
