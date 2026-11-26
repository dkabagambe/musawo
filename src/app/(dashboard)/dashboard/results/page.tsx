import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
export const dynamic = "force-dynamic";

export const metadata = { title: "My Results" };

export default async function MyResultsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const attempts = await db.examAttempt.findMany({
    where: { userId: session.user.id },
    include: {
      exam: {
        select: {
          id: true,
          title: true,
          course: { select: { title: true } },
          block: { select: { order: true, title: true } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  const results = attempts.map((attempt) => ({
    id: attempt.id,
    examId: attempt.exam.id,
    examTitle: attempt.exam.title,
    courseTitle: attempt.exam.course?.title || "Unknown Course",
    blockOrder: attempt.exam.block?.order || 0,
    blockTitle: attempt.exam.block?.title || "Unknown Block",
    attemptNumber: attempt.number,
    score: attempt.score,
    maxScore: attempt.maxScore,
    percentage: attempt.score && attempt.maxScore ? Math.round((attempt.score / attempt.maxScore) * 100) : 0,
    status: attempt.status,
    passed: attempt.passed,
    submittedAt: attempt.submittedAt,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Results</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {results.length} exam result{results.length !== 1 ? "s" : ""}
        </p>
      </div>

      {results.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">No exam results yet. Complete an exam to see your results here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <div
              key={result.id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{result.examTitle}</h3>
                    {result.status === "MARKED" && result.passed && (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> PASSED
                      </span>
                    )}
                    {result.status === "MARKED" && !result.passed && (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-700 dark:text-red-400 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> FAILED
                      </span>
                    )}
                    {result.status === "SUBMITTED" && (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> PENDING REVIEW
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {result.courseTitle} • Block {result.blockOrder}: {result.blockTitle}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Attempt {result.attemptNumber}</p>
                  {result.submittedAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Submitted: {new Date(result.submittedAt).toLocaleDateString()} at{" "}
                      {new Date(result.submittedAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  {result.status === "MARKED" && (
                    <>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {result.percentage}%
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {result.score}/{result.maxScore}
                      </div>
                    </>
                  )}
                  <Link
                    href={`/dashboard/results/${result.examId}`}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
