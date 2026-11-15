import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { ClipboardList, CheckCircle2, XCircle, Clock, FileText, Printer } from "lucide-react";
export const dynamic = "force-dynamic";

export const metadata = { title: "My Results" };

/** Map a percentage to a letter grade (Ugandan academic scale). */
function letterGrade(pct: number | null): string | null {
  if (pct == null) return null;
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}

export default async function ResultsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Official results: only published entries (releasedAt IS NOT NULL)
  const released = await db.gradeEntry.findMany({
    where: { userId: session.user.id, releasedAt: { not: null } },
    include: { course: { select: { title: true } } },
    orderBy: { releasedAt: "desc" },
  });

  // In-progress or submitted attempts (useful info to show separately)
  const inProgress = await db.examAttempt.findMany({
    where: { userId: session.user.id, status: "IN_PROGRESS" },
    include: { exam: { include: { course: { select: { title: true } } } } },
  });

  // Pending review (SUBMITTED but not yet MARKED) - for short-answer exams
  const pendingReview = await db.examAttempt.findMany({
    where: { userId: session.user.id, status: "SUBMITTED" },
    include: { exam: { include: { course: { select: { title: true } } } } },
    orderBy: { submittedAt: "desc" },
  });

  // Group released results by course
  const byCourse: Record<
    string,
    { courseTitle: string; entries: typeof released }
  > = {};
  for (const entry of released) {
    const key = entry.courseId;
    if (!byCourse[key]) {
      byCourse[key] = { courseTitle: entry.course.title, entries: [] };
    }
    byCourse[key].entries.push(entry);
  }

  const hasReleasedResults = released.length > 0;
  const empty = !hasReleasedResults && inProgress.length === 0 && pendingReview.length === 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">My Results</h1>
          <p className="text-gray-500 text-sm mt-1">
            Results are published by the Principal and approved by the Director.
          </p>
        </div>
        {hasReleasedResults && (
          <Link
            href="/api/results/statement"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary no-underline hover:underline flex-shrink-0 mt-1"
          >
            <Printer className="w-3.5 h-3.5" />
            Print results statement
          </Link>
        )}
      </div>

      {/* In progress */}
      {inProgress.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">In Progress</h2>
          <div className="space-y-3">
            {inProgress.map((att) => (
              <div
                key={att.id}
                className="bg-warning/5 border border-warning/25 rounded-2xl p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-warning/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-primary">{att.exam.title}</p>
                  <p className="text-xs text-gray-400">{att.exam.course.title}</p>
                </div>
                <Link
                  href={`/dashboard/exams/${att.examId}`}
                  className="btn-primary text-xs px-4 py-2 no-underline flex-shrink-0"
                >
                  Continue
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending tutor review */}
      {pendingReview.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Awaiting Review</h2>
          <div className="space-y-3">
            {pendingReview.map((att) => (
              <div
                key={att.id}
                className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-primary">{att.exam.title}</p>
                  <p className="text-xs text-gray-400">{att.exam.course.title}</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Submitted {att.submittedAt ? new Date(att.submittedAt).toLocaleDateString("en-UG") : ""} - awaiting tutor review
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-warning/10 text-amber-700 flex-shrink-0">
                  Under review
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {empty && (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-7 h-7 text-primary/40" />
          </div>
          <h2 className="font-bold text-primary mb-2">No results yet</h2>
          <p className="text-gray-500 text-sm">
            Results appear here once published by the Principal and approved by the Director.
          </p>
        </div>
      )}

      {/* Notice when attempts exist but results are not yet released */}
      {!hasReleasedResults && (inProgress.length > 0 || pendingReview.length > 0) && (
        <div className="bg-surface border border-border rounded-2xl p-5 text-sm text-gray-500">
          <p>
            Your official results will appear here after publication and approval by the Director.
            Short-answer questions are reviewed by your tutor first.
          </p>
        </div>
      )}

      {/* Released results by course */}
      {Object.entries(byCourse).map(([, { courseTitle, entries }]) => (
        <section
          key={courseTitle}
          className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-border bg-surface/50">
            <h2 className="font-bold text-primary">{courseTitle}</h2>
          </div>
          <div className="divide-y divide-border">
            {entries.map((entry) => {
              const pct =
                entry.percentage != null
                  ? Math.round(entry.percentage)
                  : entry.score != null && entry.maxScore
                  ? Math.round((entry.score / entry.maxScore) * 100)
                  : null;

              return (
                <div key={entry.id} className="flex items-start gap-4 px-5 py-4">
                  {/* Score circle */}
                  <div
                    className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 font-extrabold
                      ${
                        entry.passed === true
                          ? "bg-success/10 text-success"
                          : entry.passed === false
                          ? "bg-danger/10 text-danger"
                          : "bg-primary/10 text-primary"
                      }`}
                  >
                    {pct != null ? (
                      <>
                        <span className="text-lg leading-none">{pct}</span>
                        <span className="text-[10px] leading-none">%</span>
                      </>
                    ) : (
                      <ClipboardList className="w-6 h-6" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-primary">{entry.itemTitle}</p>
                      {pct != null && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-surface text-gray-600">
                          {letterGrade(pct)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {entry.gradedAt
                        ? new Date(entry.gradedAt).toLocaleDateString("en-UG")
                        : "-"}
                      {entry.score != null && entry.maxScore
                        ? ` - ${entry.score}/${entry.maxScore} marks`
                        : ""}
                    </p>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Published{" "}
                      {entry.releasedAt
                        ? new Date(entry.releasedAt).toLocaleDateString("en-UG")
                        : ""}
                    </p>
                    {entry.comments && (
                      <p className="text-xs text-gray-600 mt-1.5 bg-surface/70 rounded-lg px-3 py-2 border border-border/50">
                        {entry.comments}
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {entry.passed === true ? (
                      <div className="flex items-center gap-1.5 text-success">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-bold">Pass</span>
                      </div>
                    ) : entry.passed === false ? (
                      <div className="flex items-center gap-1.5 text-danger">
                        <XCircle className="w-4 h-4" />
                        <span className="text-xs font-bold">Fail</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
