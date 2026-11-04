import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { can } from "@/lib/rbac";
import InstructorResultsPublicationForm from "./ResultsPublicationForm";
export const dynamic = "force-dynamic";


export const metadata = { title: "Marks & Results - Teaching Portal" };

export default async function TutorResultsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "exams.mark")) redirect("/403");

  const exams = await db.exam.findMany({
    where: { course: teachingCourseWhere(session.user.id) },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      course: { select: { title: true } },
      attempts: {
        where: { status: "SUBMITTED" },
        select: {
          id: true,
          score: true,
          maxScore: true,
          passed: true,
          submittedAt: true,
          user: { select: { name: true, studentNumber: true } },
          shortAnswerReviews: { select: { score: true } },
        },
        orderBy: { submittedAt: "desc" },
      },
      _count: { select: { attempts: true } },
    },
  });

  const pendingApprovals = await db.approvalRequest.findMany({
    where: {
      type: "RESULTS_PUBLICATION",
      initiatorId: session.user.id,
      status: { in: ["SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Exams available for publication request (have submissions, not already PUBLISHED)
  const examsForPublication = exams
    .filter((e) => e._count.attempts > 0 && e.status !== "PUBLISHED")
    .map((e) => ({
      examId:          e.id,
      examTitle:       e.title,
      courseName:      e.course.title,
      submissionCount: e._count.attempts,
    }));

  const STATUS_STYLE: Record<string, string> = {
    SUBMITTED: "badge-warning",
    IN_REVIEW: "badge-info",
    APPROVED: "badge-success",
    REJECTED: "badge-danger",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary">Marks & Results</h1>
          <p className="text-sm text-gray-500 mt-1">
            Submit marks for Admin processing, then Principal and Director approval before results are published to students.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap flex-shrink-0">
          <InstructorResultsPublicationForm exams={examsForPublication} />
          <a
            href="/api/results/export"
            className="btn-outline text-sm no-underline flex-shrink-0"
            download
          >
            Download all marks (CSV)
          </a>
        </div>
      </div>

      {pendingApprovals.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-sm text-primary mb-3">My Publication Requests</h2>
          <div className="space-y-2">
            {pendingApprovals.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate pr-4">{r.reason?.slice(0, 80) ?? "Results publication"}</span>
                <span className={`badge text-xs flex-shrink-0 ${STATUS_STYLE[r.status] ?? "badge-info"}`}>
                  {r.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {exams.length === 0 ? (
        <div className="card py-16 text-center text-gray-400 text-sm">
          No exams for your courses yet.
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => {
            const graded = exam.attempts.filter((a) => a.passed !== null);
            const passed = graded.filter((a) => a.passed).length;
            return (
              <div key={exam.id} className="card">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                  <div>
                    <h2 className="font-bold text-primary">{exam.title}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{exam.course.title}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-right text-xs text-gray-400">
                      <p>{exam._count.attempts} total submissions</p>
                      {graded.length > 0 && (
                        <p className="font-semibold text-primary">
                          {passed}/{graded.length} passed ({Math.round((passed / graded.length) * 100)}%)
                        </p>
                      )}
                    </div>
                    <a
                      href={`/api/results/export?examId=${exam.id}`}
                      className="btn-outline text-xs no-underline flex-shrink-0"
                      download
                    >
                      Download CSV
                    </a>
                  </div>
                </div>

                {exam.attempts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-400 border-b border-border">
                          <th className="pb-2 font-medium pr-4">Student</th>
                          <th className="pb-2 font-medium pr-4">Student No.</th>
                          <th className="pb-2 font-medium pr-4">Score</th>
                          <th className="pb-2 font-medium pr-4">Pass/Fail</th>
                          <th className="pb-2 font-medium">Submitted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {exam.attempts.map((att) => {
                          const pct =
                            att.score != null && att.maxScore && att.maxScore > 0
                              ? Math.round((att.score / att.maxScore) * 100)
                              : null;
                          return (
                            <tr key={att.id} className="hover:bg-surface/40">
                              <td className="py-2 pr-4 font-medium">{att.user.name}</td>
                              <td className="py-2 pr-4 font-mono text-xs text-gray-500">{att.user.studentNumber ?? "-"}</td>
                              <td className="py-2 pr-4 font-semibold">
                                {pct != null ? `${pct}%` : "Pending"}
                              </td>
                              <td className="py-2 pr-4">
                                {att.passed === true && <span className="badge badge-success text-xs">Pass</span>}
                                {att.passed === false && <span className="badge badge-danger text-xs">Fail</span>}
                                {att.passed === null && <span className="badge badge-warning text-xs">Pending</span>}
                              </td>
                              <td className="py-2 text-xs text-gray-400">
                                {att.submittedAt ? new Date(att.submittedAt).toLocaleDateString("en-UG") : "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No submissions yet.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
