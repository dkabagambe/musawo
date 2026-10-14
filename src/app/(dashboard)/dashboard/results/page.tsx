import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "Exam Results" };

export default async function ResultsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const attempts = await db.examAttempt.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["SUBMITTED", "MARKED"] },
    },
    include: {
      exam: {
        include: {
          course: { select: { title: true, slug: true } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  const inProgress = await db.examAttempt.findMany({
    where: { userId: session.user.id, status: "IN_PROGRESS" },
    include: {
      exam: {
        include: { course: { select: { title: true, slug: true } } },
      },
    },
  });

  // Group by course
  const byCourse: Record<
    string,
    { courseTitle: string; courseSlug: string; attempts: typeof attempts }
  > = {};

  for (const att of attempts) {
    const key = att.exam.courseId;
    if (!byCourse[key]) {
      byCourse[key] = {
        courseTitle: att.exam.course.title,
        courseSlug: att.exam.course.slug,
        attempts: [],
      };
    }
    byCourse[key].attempts.push(att);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl mb-6">Exam Results</h1>

      {/* In-progress */}
      {inProgress.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">In progress</h2>
          <div className="space-y-3">
            {inProgress.map((att) => (
              <div key={att.id} className="card flex items-center gap-4 border-warning/30 bg-warning/5">
                <span className="text-2xl" aria-hidden="true">⏱</span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{att.exam.title}</p>
                  <p className="text-xs text-gray-400">{att.exam.course.title}</p>
                </div>
                <Link
                  href={`/dashboard/exams/${att.examId}`}
                  className="btn-primary text-xs px-4 py-1.5 no-underline"
                >
                  Continue
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {Object.keys(byCourse).length === 0 && inProgress.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-4xl mb-3" aria-hidden="true">📋</p>
          <p className="text-gray-500 text-sm">
            No exam results yet. Complete an exam to see your results here.
          </p>
        </div>
      )}

      {Object.entries(byCourse).map(([, { courseTitle, attempts: courseAttempts }]) => (
        <section key={courseTitle} className="card mb-6">
          <h2 className="font-semibold mb-4">{courseTitle}</h2>
          <div className="space-y-4">
            {courseAttempts.map((att) => {
              const percentage =
                att.score != null && att.maxScore
                  ? Math.round((att.score / att.maxScore) * 100)
                  : null;

              return (
                <div
                  key={att.id}
                  className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{att.exam.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Attempt {att.number} ·{" "}
                      {att.submittedAt
                        ? new Date(att.submittedAt).toLocaleDateString("en-UG")
                        : "-"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {att.status === "SUBMITTED" ? (
                      <span className="badge badge-warning">Pending review</span>
                    ) : percentage != null ? (
                      <>
                        <p className="font-bold text-lg text-primary">
                          {percentage}%
                        </p>
                        <p className="text-xs text-gray-400">
                          {att.score}/{att.maxScore}
                        </p>
                        {att.passed === true ? (
                          <span className="badge badge-success">Pass</span>
                        ) : att.passed === false ? (
                          <span className="badge badge-danger">Fail</span>
                        ) : null}
                      </>
                    ) : (
                      <span className="badge badge-info">Marked</span>
                    )}
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
