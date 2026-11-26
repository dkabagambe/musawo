import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock, ArrowLeft } from "lucide-react";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { examId: string } }) {
  return { title: "Exam Results" };
}

export default async function ExamResultPage({ params }: { params: { examId: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const exam = await db.exam.findUnique({
    where: { id: params.examId },
    include: {
      course: { select: { title: true } },
      block: { select: { order: true, title: true } },
      questions: { select: { id: true, text: true, points: true, type: true } },
    },
  });

  if (!exam) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">Exam not found.</p>
          <Link href="/dashboard/results" className="text-blue-600 dark:text-blue-400 hover:underline mt-4 inline-block">
            Back to Results
          </Link>
        </div>
      </div>
    );
  }

  const latestAttempt = await db.examAttempt.findFirst({
    where: { examId: params.examId, userId: session.user.id, status: { in: ["MARKED", "SUBMITTED"] } },
    orderBy: { submittedAt: "desc" },
  });

  if (!latestAttempt) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">No results found for this exam.</p>
          <Link href="/dashboard/results" className="text-blue-600 dark:text-blue-400 hover:underline mt-4 inline-block">
            Back to Results
          </Link>
        </div>
      </div>
    );
  }

  const percentage = latestAttempt.score && latestAttempt.maxScore 
    ? Math.round((latestAttempt.score / latestAttempt.maxScore) * 100) 
    : 0;

  const breakdown = latestAttempt.answers ? Object.keys(latestAttempt.answers as Record<string, string>) : [];

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      {/* Header */}
      <Link href="/dashboard/results" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Results
      </Link>

      {/* Score Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">{exam.title}</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {exam.course?.title} • Block {exam.block?.order}: {exam.block?.title}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Attempt {latestAttempt.number}</p>
            {latestAttempt.submittedAt && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Submitted: {new Date(latestAttempt.submittedAt).toLocaleDateString()} at{" "}
                {new Date(latestAttempt.submittedAt).toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="text-center border-l border-gray-200 dark:border-gray-700 pl-6">
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">{percentage}%</div>
            <div className="text-xl font-semibold mb-2">
              {latestAttempt.score}/{latestAttempt.maxScore}
            </div>
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${
                latestAttempt.passed
                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                  : latestAttempt.status === "SUBMITTED"
                  ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                  : "bg-red-500/10 text-red-700 dark:text-red-400"
              }`}
            >
              {latestAttempt.passed && <CheckCircle2 className="w-4 h-4" />}
              {latestAttempt.status === "SUBMITTED" && <Clock className="w-4 h-4" />}
              {latestAttempt.passed === false && <XCircle className="w-4 h-4" />}
              <span className="font-medium">
                {latestAttempt.passed ? "PASSED" : latestAttempt.status === "SUBMITTED" ? "PENDING REVIEW" : "FAILED"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {latestAttempt.status === "SUBMITTED" && (
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900 dark:text-yellow-100">Exam Under Review</p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                This exam includes short-answer questions. Your tutor is reviewing and will provide feedback soon. Check back for updates.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Question Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4">Question Breakdown</h2>
        <div className="space-y-4">
          {exam.questions.map((question, idx) => {
            const answer = (latestAttempt.answers as Record<string, string> || {})[question.id];
            const isShortAnswer = question.type === "SHORT_ANSWER";
            
            return (
              <div key={question.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-medium">Question {idx + 1}</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{question.text}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Points: {question.points}</div>
                    {!isShortAnswer && (
                      <div
                        className={`text-xs font-semibold mt-1 ${
                          answer ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-500"
                        }`}
                      >
                        {answer ? "✓ Correct" : "✗ Incorrect"}
                      </div>
                    )}
                    {isShortAnswer && (
                      <div className="text-xs font-semibold mt-1 text-yellow-600 dark:text-yellow-400">
                        ⏱ Awaiting review
                      </div>
                    )}
                  </div>
                </div>
                {answer && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Your answer:</div>
                    <div className="text-sm">{answer}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Total */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-blue-900 dark:text-blue-100">Total Score</span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {latestAttempt.score}/{latestAttempt.maxScore} ({percentage}%)
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Link href="/dashboard/exams" className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors">
          Back to Exams
        </Link>
        <Link href="/dashboard/results" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          All Results
        </Link>
      </div>
    </div>
  );
}
