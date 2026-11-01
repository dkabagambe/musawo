import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";

export const metadata = { title: "Examinations & Results - Director" };

export default async function DirectorExaminationsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "grades.view")) redirect("/login");

  const [exams, totalAttempts, passed, failed, pendingApprovals] = await Promise.all([
    db.exam.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        status: true,
        passPercent: true,
        timeLimitMin: true,
        createdAt: true,
        course: { select: { title: true } },
        _count: { select: { attempts: true } },
      },
    }),
    db.examAttempt.count({ where: { status: "SUBMITTED" } }),
    db.examAttempt.count({ where: { status: "SUBMITTED", passed: true } }),
    db.examAttempt.count({ where: { status: "SUBMITTED", passed: false } }),
    db.approvalRequest.count({
      where: { type: "RESULTS_PUBLICATION", status: { in: ["SUBMITTED", "IN_REVIEW"] } },
    }),
  ]);

  const passRate = totalAttempts > 0 ? Math.round((passed / totalAttempts) * 100) : null;

  const STATUS_STYLE: Record<string, string> = {
    PUBLISHED: "badge-success",
    DRAFT: "badge-warning",
    ARCHIVED: "badge-danger",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Examinations & Results</h1>
        <p className="text-sm text-gray-500 mt-0.5">Read-only overview across all courses</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total exams", value: exams.length },
          { label: "Submissions", value: totalAttempts },
          { label: "Pass rate", value: passRate !== null ? `${passRate}%` : "N/A" },
          { label: "Pending approval", value: pendingApprovals, warn: pendingApprovals > 0 },
        ].map((s) => (
          <div key={s.label} className={`card text-center ${s.warn ? "border-warning/40 bg-warning/5" : ""}`}>
            <p className="text-2xl font-bold text-primary">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {pendingApprovals > 0 && (
        <div className="card bg-warning/5 border-warning/40 text-sm text-amber-800">
          <strong>{pendingApprovals}</strong> exam result publication request{pendingApprovals !== 1 ? "s" : ""} await your approval.{" "}
          <a href="/director/approvals?status=PENDING" className="underline text-amber-900 font-semibold">Review now</a>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Exam</th>
              <th className="pb-2 font-medium pr-4">Course</th>
              <th className="pb-2 font-medium pr-4">Submissions</th>
              <th className="pb-2 font-medium pr-4">Time limit</th>
              <th className="pb-2 font-medium pr-4">Pass %</th>
              <th className="pb-2 font-medium pr-4">Status</th>
              <th className="pb-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {exams.map((e) => (
              <tr key={e.id} className="hover:bg-surface/40">
                <td className="py-2.5 pr-4 font-medium">{e.title}</td>
                <td className="py-2.5 pr-4 text-xs text-gray-500">{e.course.title}</td>
                <td className="py-2.5 pr-4 text-center">{e._count.attempts}</td>
                <td className="py-2.5 pr-4 text-xs text-gray-500">
                  {e.timeLimitMin ? `${e.timeLimitMin} min` : "None"}
                </td>
                <td className="py-2.5 pr-4 text-center font-semibold">{e.passPercent}%</td>
                <td className="py-2.5 pr-4">
                  <span className={`badge text-xs ${STATUS_STYLE[e.status] ?? "badge-info"}`}>
                    {e.status}
                  </span>
                </td>
                <td className="py-2.5 text-xs text-gray-400">
                  {new Date(e.createdAt).toLocaleDateString("en-UG")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {exams.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">No exams found.</p>
        )}
      </div>
    </div>
  );
}
