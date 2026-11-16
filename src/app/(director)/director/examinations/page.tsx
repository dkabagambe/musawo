import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Examinations & Results - Director" };

interface Props {
  searchParams: { course?: string; status?: string; page?: string };
}

export default async function DirectorExaminationsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "grades.view")) redirect("/login");

  const courseFilter = searchParams.course ?? "";
  const statusFilter = searchParams.status ?? "";
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 30;
  const skip = (page - 1) * take;

  const examWhere: Record<string, unknown> = {};
  if (courseFilter) examWhere.courseId = courseFilter;
  if (statusFilter) examWhere.status = statusFilter;

  const [exams, totalExams, allCourses, pendingApprovals, globalStats] = await Promise.all([
    db.exam.findMany({
      where: examWhere,
      orderBy: [{ course: { title: "asc" } }, { createdAt: "desc" }],
      take,
      skip,
      select: {
        id: true,
        title: true,
        status: true,
        passPercent: true,
        timeLimitMin: true,
        createdAt: true,
        course: { select: { id: true, title: true } },
        _count: { select: { attempts: true, questions: true } },
      },
    }),
    db.exam.count({ where: examWhere }),
    db.course.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    // Pending RESULTS_PUBLICATION approvals
    db.approvalRequest.findMany({
      where: {
        type: "RESULTS_PUBLICATION",
        status: { in: ["SUBMITTED", "IN_REVIEW"] },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, reason: true, createdAt: true, status: true, courseId: true,
        initiator: { select: { name: true, role: true } },
        reviewer:  { select: { name: true } },
      },
    }),
    // Global stats
    db.examAttempt.groupBy({
      by: ["passed"],
      where: { status: "SUBMITTED" },
      _count: { id: true },
    }),
  ]);

  const totalPages = Math.ceil(totalExams / take);

  // Global pass / fail counts
  let totalPassed = 0;
  let totalFailed = 0;
  for (const row of globalStats) {
    if (row.passed === true)  totalPassed = row._count.id;
    if (row.passed === false) totalFailed = row._count.id;
  }
  const totalSubmitted = totalPassed + totalFailed;
  const passRate = totalSubmitted > 0 ? Math.round((totalPassed / totalSubmitted) * 100) : null;

  // Per-exam attempt stats (pass rate, average score)
  const examIds = exams.map((e) => e.id);
  const attemptStats = await db.examAttempt.groupBy({
    by: ["examId", "passed"],
    where: { examId: { in: examIds }, status: "SUBMITTED" },
    _count: { id: true },
    _avg:  { score: true },
  });
  type AttemptStat = { examId: string; passed: boolean | null; _count: { id: number }; _avg: { score: number | null } };
  const statsByExam: Record<string, { pass: number; fail: number; avg: number | null }> = {};
  for (const row of attemptStats as AttemptStat[]) {
    if (!statsByExam[row.examId]) statsByExam[row.examId] = { pass: 0, fail: 0, avg: null };
    if (row.passed === true)  { statsByExam[row.examId].pass = row._count.id; statsByExam[row.examId].avg = row._avg.score; }
    if (row.passed === false) statsByExam[row.examId].fail = row._count.id;
  }

  // Map courseId from pending approvals back to exam titles
  // (courseId on RESULTS_PUBLICATION actually stores examId — see api/approvals/[id]/route.ts)
  const pendingExamIds = pendingApprovals.map((a) => a.courseId).filter(Boolean) as string[];
  const pendingExamTitles: Record<string, string> = {};
  if (pendingExamIds.length) {
    const pExams = await db.exam.findMany({
      where: { id: { in: pendingExamIds } },
      select: { id: true, title: true, course: { select: { title: true } } },
    });
    for (const e of pExams) pendingExamTitles[e.id] = `${e.title} (${e.course.title})`;
  }

  const STATUS_STYLE: Record<string, string> = {
    PUBLISHED: "badge-success",
    DRAFT:     "badge-warning",
    ARCHIVED:  "badge-danger",
  };
  const APPROVAL_STATUS_STYLE: Record<string, string> = {
    SUBMITTED: "badge-warning",
    IN_REVIEW: "badge-warning",
  };

  function ageDays(d: Date) {
    return Math.floor((Date.now() - d.getTime()) / 86_400_000);
  }

  function qs(overrides: Record<string, string | number>) {
    const params = new URLSearchParams();
    if (courseFilter) params.set("course", courseFilter);
    if (statusFilter) params.set("status", statusFilter);
    for (const [k, v] of Object.entries(overrides)) {
      if (String(v)) params.set(k, String(v));
    }
    return `/director/examinations?${params.toString()}`;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Examinations and Results</h1>
        <p className="text-sm text-gray-500 mt-0.5">Read-only. The Director approves results publication.</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Exams",            value: totalExams },
          { label: "Submissions",      value: totalSubmitted },
          { label: "Overall pass rate",value: passRate !== null ? `${passRate}%` : "N/A" },
          { label: "Awaiting approval",value: pendingApprovals.length, warn: pendingApprovals.length > 0 },
        ].map((s) => (
          <div key={s.label} className={`card text-center ${s.warn ? "border-warning/40 bg-warning/5" : ""}`}>
            <p className="text-2xl font-bold text-primary">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pending approvals panel */}
      {pendingApprovals.length > 0 && (
        <div className="card border-warning/40 bg-warning/5 space-y-3">
          <h2 className="font-semibold text-sm text-amber-800">
            Results publication awaiting your approval ({pendingApprovals.length})
          </h2>
          <div className="space-y-2">
            {pendingApprovals.map((apr) => {
              const age = ageDays(apr.createdAt);
              const examTitle = apr.courseId ? (pendingExamTitles[apr.courseId] ?? apr.courseId) : "Unknown exam";
              return (
                <div key={apr.id} className="flex items-start justify-between gap-4 flex-wrap border-b border-warning/20 pb-2 last:border-0 last:pb-0">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{examTitle}</p>
                    <p className="text-xs text-gray-500">
                      Submitted by {apr.initiator.name} ({apr.initiator.role.toLowerCase()})
                      {apr.reviewer && <span> &rarr; reviewed by {apr.reviewer.name}</span>}
                    </p>
                    {apr.reason && (
                      <p className="text-xs text-gray-400 max-w-prose">{apr.reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs ${age >= 7 ? "text-danger font-semibold" : age >= 3 ? "text-amber-600" : "text-gray-400"}`}>
                      {age === 0 ? "Today" : age === 1 ? "1 day ago" : `${age} days ago`}
                    </span>
                    <span className={`badge text-xs ${APPROVAL_STATUS_STYLE[apr.status] ?? "badge-info"}`}>
                      {apr.status === "IN_REVIEW" ? "In review" : "Waiting"}
                    </span>
                    <Link
                      href={`/director/approvals/${apr.id}`}
                      className="btn-primary text-xs px-3 py-1 no-underline"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <select name="course" defaultValue={courseFilter} className="input text-sm max-w-xs">
          <option value="">All courses</option>
          {allCourses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <select name="status" defaultValue={statusFilter} className="input text-sm">
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button type="submit" className="btn-secondary text-sm">Filter</button>
        {(courseFilter || statusFilter) && (
          <Link href="/director/examinations" className="btn-ghost text-sm no-underline">Clear</Link>
        )}
      </form>

      {/* Exams table with per-exam stats */}
      <div className="card overflow-x-auto">
        <p className="text-xs text-gray-400 mb-3">{totalExams} exam{totalExams !== 1 ? "s" : ""}</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Exam</th>
              <th className="pb-2 font-medium pr-4">Course</th>
              <th className="pb-2 font-medium pr-4">Questions</th>
              <th className="pb-2 font-medium pr-4">Submissions</th>
              <th className="pb-2 font-medium pr-4">Pass rate</th>
              <th className="pb-2 font-medium pr-4">Avg score</th>
              <th className="pb-2 font-medium pr-4">Pass %</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {exams.map((e) => {
              const st = statsByExam[e.id];
              const total = (st?.pass ?? 0) + (st?.fail ?? 0);
              const rate  = total > 0 ? Math.round(((st?.pass ?? 0) / total) * 100) : null;
              return (
                <tr key={e.id} className="hover:bg-surface/40">
                  <td className="py-2.5 pr-4 font-medium">{e.title}</td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">{e.course.title}</td>
                  <td className="py-2.5 pr-4 text-center text-xs">{e._count.questions}</td>
                  <td className="py-2.5 pr-4 text-center">{e._count.attempts}</td>
                  <td className="py-2.5 pr-4 text-center">
                    {rate !== null ? (
                      <span className={`font-semibold ${rate >= e.passPercent ? "text-success" : "text-danger"}`}>
                        {rate}%
                      </span>
                    ) : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-center text-xs text-gray-500">
                    {st?.avg !== null && st?.avg !== undefined
                      ? Math.round(st.avg)
                      : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-center text-xs text-gray-500">
                    {e.passPercent}%
                  </td>
                  <td className="py-2.5">
                    <span className={`badge text-xs ${STATUS_STYLE[e.status] ?? "badge-info"}`}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {exams.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">No exams found.</p>
        )}

        {totalPages > 1 && (
          <div className="flex justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={qs({ page: page - 1 })} className="btn-outline text-xs px-3 py-1.5 no-underline">Previous</Link>
              )}
              {page < totalPages && (
                <Link href={qs({ page: page + 1 })} className="btn-primary text-xs px-3 py-1.5 no-underline">Next</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
