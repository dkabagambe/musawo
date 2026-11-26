import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Clock, Lock, CheckCircle2, XCircle, RotateCw } from "lucide-react";
import { getAccessLevel, canAccess } from "@/lib/enrolment/access";
export const dynamic = "force-dynamic";

export const metadata = { title: "My Exams" };

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: "Available", color: "bg-green-500/10 text-green-700 dark:text-green-400" },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  PASSED: { label: "Passed", color: "bg-green-500/10 text-green-700 dark:text-green-400" },
  FAILED: { label: "Failed", color: "bg-red-500/10 text-red-700 dark:text-red-400" },
  LOCKED: { label: "Locked", color: "bg-gray-500/10 text-gray-700 dark:text-gray-400" },
  PENDING_REVIEW: { label: "Pending Review", color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" },
};

export default async function MyExamsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED", "OVERDUE"] } },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          blocks: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              order: true,
              title: true,
              exams: {
                where: { status: "PUBLISHED" },
                orderBy: { startWindowAt: "asc" },
              },
            },
          },
        },
      },
    },
  });

  const exams: Array<{
    id: string;
    title: string;
    courseTitle: string;
    blockOrder: number;
    blockTitle: string;
    status: "AVAILABLE" | "IN_PROGRESS" | "PASSED" | "FAILED" | "LOCKED" | "PENDING_REVIEW";
    score?: number;
    maxScore?: number;
    percentage?: number;
    passed?: boolean;
    attemptNumber?: number;
    attemptLimit: number;
    timeLimitMin?: number;
    access: { allowed: boolean; reason: string | null };
  }> = [];

  for (const enr of enrolments) {
    for (const block of enr.course.blocks) {
      for (const exam of block.exams) {
        // Check access
        const access = canAccess(
          { type: "exam", blockOrder: block.order },
          {
            status: enr.status,
            paidPercent: enr.paidPercent,
            provisionalUntil: enr.provisionalUntil,
            graceUntil: enr.graceUntil,
            overdueSince: enr.overdueSince,
          }
        );

        if (!access.allowed) {
          exams.push({
            id: exam.id,
            title: exam.title,
            courseTitle: enr.course.title,
            blockOrder: block.order,
            blockTitle: block.title,
            status: "LOCKED",
            attemptLimit: exam.attemptLimit,
            timeLimitMin: exam.timeLimitMin ?? undefined,
            access,
          });
          continue;
        }

        // Get latest attempt
        const latestAttempt = await db.examAttempt.findFirst({
          where: { examId: exam.id, userId: session.user.id },
          orderBy: { createdAt: "desc" },
        });

        const inProgress = await db.examAttempt.findFirst({
          where: { examId: exam.id, userId: session.user.id, status: "IN_PROGRESS" },
        });

        let status: "AVAILABLE" | "IN_PROGRESS" | "PASSED" | "FAILED" | "PENDING_REVIEW";
        if (inProgress) {
          status = "IN_PROGRESS";
        } else if (latestAttempt?.status === "MARKED") {
          status = latestAttempt.passed ? "PASSED" : "FAILED";
        } else if (latestAttempt?.status === "SUBMITTED") {
          status = "PENDING_REVIEW";
        } else {
          status = "AVAILABLE";
        }

        exams.push({
          id: exam.id,
          title: exam.title,
          courseTitle: enr.course.title,
          blockOrder: block.order,
          blockTitle: block.title,
          status,
          score: latestAttempt?.score ?? undefined,
          maxScore: latestAttempt?.maxScore ?? undefined,
          percentage: latestAttempt?.score && latestAttempt?.maxScore 
            ? Math.round((latestAttempt.score / latestAttempt.maxScore) * 100) 
            : undefined,
          passed: latestAttempt?.passed ?? undefined,
          attemptNumber: latestAttempt?.number ?? undefined,
          attemptLimit: exam.attemptLimit,
          timeLimitMin: exam.timeLimitMin ?? undefined,
          access,
        });
      }
    }
  }

  exams.sort((a, b) => a.blockOrder - b.blockOrder || a.title.localeCompare(b.title));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Exams</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {exams.length} exam{exams.length !== 1 ? "s" : ""} available
        </p>
      </div>

      {exams.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">No exams available yet. Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{exam.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_BADGE[exam.status]?.color || ""}`}>
                      {STATUS_BADGE[exam.status]?.label || exam.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {exam.courseTitle} • Block {exam.blockOrder}: {exam.blockTitle}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Attempts: {exam.attemptNumber || 0} of {exam.attemptLimit}
                  </p>

                  {exam.status === "LOCKED" && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                      <Lock className="w-4 h-4" />
                      {exam.access.reason}
                    </p>
                  )}

                  {exam.status === "PASSED" && exam.percentage !== undefined && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Scored: {exam.percentage}% ({exam.score}/{exam.maxScore})
                    </p>
                  )}

                  {exam.status === "FAILED" && exam.percentage !== undefined && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      Scored: {exam.percentage}% ({exam.score}/{exam.maxScore})
                    </p>
                  )}

                  {exam.status === "PENDING_REVIEW" && (
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Your tutor is reviewing this exam. Check back soon.
                    </p>
                  )}

                  {exam.timeLimitMin && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Time limit: {exam.timeLimitMin} minutes
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {exam.status === "AVAILABLE" && (
                    <Link
                      href={`/dashboard/exams/${exam.id}`}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Start Exam
                    </Link>
                  )}
                  {exam.status === "IN_PROGRESS" && (
                    <Link
                      href={`/dashboard/exams/${exam.id}`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Resume Exam
                    </Link>
                  )}
                  {exam.status === "FAILED" && exam.attemptNumber !== undefined && exam.attemptNumber < exam.attemptLimit && (
                    <Link
                      href={`/dashboard/exams/${exam.id}`}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1 justify-center"
                    >
                      <RotateCw className="w-4 h-4" />
                      Retake
                    </Link>
                  )}
                  {exam.status === "PASSED" && (
                    <Link
                      href={`/dashboard/results/${exam.id}`}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      View Results
                    </Link>
                  )}
                  {exam.status === "FAILED" && exam.attemptNumber !== undefined && exam.attemptNumber >= exam.attemptLimit && (
                    <button
                      disabled
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed"
                    >
                      No Attempts Left
                    </button>
                  )}
                  {exam.status === "LOCKED" && (
                    <Link
                      href="/dashboard/fees"
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      Pay to Unlock
                    </Link>
                  )}
                  {exam.status === "PENDING_REVIEW" && (
                    <button disabled className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed">
                      Under Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
