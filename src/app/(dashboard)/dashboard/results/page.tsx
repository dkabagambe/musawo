import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { ClipboardList, CheckCircle2, XCircle, Clock, ArrowRight } from "lucide-react";

export const metadata = { title: "Exam Results" };

export default async function ResultsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [attempts, inProgress] = await Promise.all([
    db.examAttempt.findMany({
      where: { userId: session.user.id, status: { in: ["SUBMITTED","MARKED"] } },
      include: { exam: { include: { course: { select: { title: true, slug: true } } } } },
      orderBy: { submittedAt: "desc" },
    }),
    db.examAttempt.findMany({
      where: { userId: session.user.id, status: "IN_PROGRESS" },
      include: { exam: { include: { course: { select: { title: true } } } } },
    }),
  ]);

  // Group by course
  const byCourse: Record<string, { courseTitle: string; courseSlug: string; attempts: typeof attempts }> = {};
  for (const att of attempts) {
    const key = att.exam.courseId;
    if (!byCourse[key]) byCourse[key] = { courseTitle: att.exam.course.title, courseSlug: att.exam.course.slug, attempts: [] };
    byCourse[key].attempts.push(att);
  }

  const empty = Object.keys(byCourse).length === 0 && inProgress.length === 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Exam Results</h1>
        <p className="text-gray-500 text-sm mt-1">Your exam attempts and scores</p>
      </div>

      {/* In progress */}
      {inProgress.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">In Progress</h2>
          <div className="space-y-3">
            {inProgress.map((att) => (
              <div key={att.id} className="bg-warning/5 border border-warning/25 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-warning/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-primary">{att.exam.title}</p>
                  <p className="text-xs text-gray-400">{att.exam.course.title}</p>
                </div>
                <Link href={`/dashboard/exams/${att.examId}`} className="btn-primary text-xs px-4 py-2 no-underline flex-shrink-0">
                  Continue
                </Link>
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
          <p className="text-gray-500 text-sm">Complete an exam to see your results here.</p>
        </div>
      )}

      {/* Results by course */}
      {Object.entries(byCourse).map(([, { courseTitle, attempts: courseAttempts }]) => (
        <section key={courseTitle} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-surface/50">
            <h2 className="font-bold text-primary">{courseTitle}</h2>
          </div>
          <div className="divide-y divide-border">
            {courseAttempts.map((att) => {
              const pct = att.score != null && att.maxScore ? Math.round((att.score / att.maxScore) * 100) : null;
              const pending = att.status === "SUBMITTED";
              return (
                <div key={att.id} className="flex items-center gap-4 px-5 py-4">
                  {/* Score circle */}
                  <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 font-extrabold
                    ${pending            ? "bg-warning/10 text-amber-600"
                    : att.passed === true  ? "bg-success/10 text-success"
                    : att.passed === false ? "bg-danger/10 text-danger"
                    :                       "bg-primary/10 text-primary"}`}>
                    {pending ? (
                      <Clock className="w-6 h-6" />
                    ) : pct != null ? (
                      <>
                        <span className="text-lg leading-none">{pct}</span>
                        <span className="text-[10px] leading-none">%</span>
                      </>
                    ) : (
                      <ClipboardList className="w-6 h-6" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-primary">{att.exam.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Attempt {att.number} · {att.submittedAt ? new Date(att.submittedAt).toLocaleDateString("en-UG") : "—"}
                      {att.score != null && att.maxScore ? ` · ${att.score}/${att.maxScore} marks` : ""}
                    </p>
                  </div>

                  <div className="flex-shrink-0">
                    {pending ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-warning/10 text-amber-700">
                        Pending review
                      </span>
                    ) : att.passed === true ? (
                      <div className="flex items-center gap-1.5 text-success">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-bold">Pass</span>
                      </div>
                    ) : att.passed === false ? (
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
