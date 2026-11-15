import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { ClipboardList, Lock, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { getAccessLevel } from "@/lib/enrolment/access";
export const dynamic = "force-dynamic";

export const metadata = { title: "Examinations" };

export default async function StudentExamsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id, status: { in: ["ACTIVE", "PARTIALLY_PAID", "OVERDUE", "COMPLETED", "PENDING_PAYMENT"] } },
    select: {
      courseId: true,
      status: true,
      paidPercent: true,
      provisionalUntil: true,
      graceUntil: true,
      overdueSince: true,
    },
  });

  const courseIds = enrolments.map((e) => e.courseId);
  const enrolmentByCourse = new Map(enrolments.map((e) => [e.courseId, e]));

  const exams = await db.exam.findMany({
    where: { courseId: { in: courseIds }, status: "PUBLISHED" },
    include: {
      course: { select: { title: true, slug: true } },
      block: { select: { order: true } },
      attempts: {
        where: { userId: session.user.id },
        orderBy: { number: "desc" },
        take: 1,
      },
    },
    orderBy: [{ startWindowAt: "asc" }, { createdAt: "desc" }],
  });

  const now = new Date();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Examinations</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {exams.length} exam{exams.length !== 1 ? "s" : ""} available
        </p>
      </div>

      {exams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-7 h-7 text-primary/40" />
          </div>
          <h2 className="font-bold text-primary mb-2">No exams yet</h2>
          <p className="text-gray-500 text-sm">Your scheduled exams will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => {
            const enrolment = enrolmentByCourse.get(exam.courseId);
            const accessLevel = getAccessLevel(enrolment ?? null);
            const pct = enrolment?.paidPercent ?? 0;
            const blockOrder = exam.block?.order ?? 1;

            // Exam requires 100% (final) or 75% (block exams)
            const requiredPct = blockOrder >= 3 ? 100 : 75;
            const isLocked =
              accessLevel !== "FULL" &&
              accessLevel !== "COMPLETED" &&
              pct < requiredPct;

            const lockedReason = isLocked
              ? pct < 50
                ? "Pay 50% to start your course and access exams"
                : pct < 75
                ? "Pay 25% more to unlock this exam"
                : "Pay in full to unlock the final exam and earn your certificate"
              : null;

            const latest = exam.attempts[0];
            const hasInProgress = latest?.status === "IN_PROGRESS";
            const hasCompleted = latest?.status === "MARKED" || latest?.status === "SUBMITTED";
            const attemptLimitReached = !hasInProgress && latest && latest.number >= exam.attemptLimit;

            // startWindowAt: exam not open yet
            const startsAt = exam.startWindowAt ? new Date(exam.startWindowAt) : null;
            const notOpenYet = startsAt && startsAt > now;
            const startsInMs = notOpenYet && startsAt ? startsAt.getTime() - now.getTime() : null;
            const startsInMinutes = startsInMs ? Math.ceil(startsInMs / 60000) : null;
            const startsInHours = startsInMs ? Math.ceil(startsInMs / 3600000) : null;
            const timeLabel = startsInMinutes != null
              ? startsInMinutes < 60
                ? `in ${startsInMinutes} minute${startsInMinutes !== 1 ? "s" : ""}`
                : `in ${startsInHours} hour${(startsInHours ?? 0) !== 1 ? "s" : ""}`
              : null;

            return (
              <div
                key={exam.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                  isLocked ? "border-border opacity-80" : "border-border"
                }`}
              >
                <div className="p-5 flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isLocked
                        ? "bg-gray-100"
                        : notOpenYet
                        ? "bg-amber-50"
                        : hasCompleted
                        ? latest.passed === true
                          ? "bg-success/10"
                          : latest.passed === false
                          ? "bg-danger/10"
                          : "bg-warning/10"
                        : "bg-primary/10"
                    }`}
                  >
                    {isLocked ? (
                      <Lock className="w-5 h-5 text-gray-400" />
                    ) : notOpenYet ? (
                      <Clock className="w-5 h-5 text-amber-600" />
                    ) : latest?.passed === true ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : latest?.passed === false ? (
                      <XCircle className="w-5 h-5 text-danger" />
                    ) : (
                      <ClipboardList className="w-5 h-5 text-primary" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary">{exam.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{exam.course.title}</p>

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                      {exam.timeLimitMin && (
                        <span>{exam.timeLimitMin} min</span>
                      )}
                      <span>Pass: {exam.passPercent}%</span>
                      <span>
                        {exam.attemptLimit} attempt{exam.attemptLimit !== 1 ? "s" : ""} allowed
                      </span>
                      {startsAt && (
                        <span>
                          {notOpenYet
                            ? `Opens ${startsAt.toLocaleDateString("en-UG", { weekday: "short", day: "numeric", month: "short" })} at ${startsAt.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Kampala" })} EAT`
                            : `Opened ${startsAt.toLocaleDateString("en-UG", { day: "numeric", month: "short" })}`}
                        </span>
                      )}
                    </div>

                    {isLocked && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
                        <Lock className="w-3 h-3" />
                        <span>{lockedReason}</span>
                      </div>
                    )}

                    {notOpenYet && !isLocked && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
                        <Clock className="w-3 h-3" />
                        <span>Exam opens {timeLabel} - prepare your notes now</span>
                      </div>
                    )}

                    {latest?.status === "SUBMITTED" && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
                        <AlertCircle className="w-3 h-3" />
                        <span>Awaiting tutor review</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {isLocked ? (
                      <Link
                        href="/dashboard/payments"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary no-underline hover:underline"
                      >
                        Pay now
                      </Link>
                    ) : notOpenYet ? (
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                        Not open yet
                      </span>
                    ) : attemptLimitReached ? (
                      <span className="text-xs text-gray-400">Limit reached</span>
                    ) : hasInProgress ? (
                      <Link
                        href={`/dashboard/exams/${exam.id}`}
                        className="btn-primary text-xs px-4 py-2 no-underline"
                      >
                        Continue
                      </Link>
                    ) : latest?.status === "SUBMITTED" ? (
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-warning/10 text-amber-700">
                        In review
                      </span>
                    ) : latest?.status === "MARKED" ? (
                      <Link
                        href="/dashboard/results"
                        className="text-xs font-medium text-primary no-underline hover:underline"
                      >
                        View result
                      </Link>
                    ) : (
                      <Link
                        href={`/dashboard/exams/${exam.id}`}
                        className="btn-primary text-xs px-4 py-2 no-underline"
                      >
                        Start exam
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-xs text-gray-400 mt-4 space-y-1">
        <p>Exams are forward-only: once you move past a question you cannot return to it.</p>
        <p>Switching tabs during an exam is logged and your tutor is notified after repeated switches.</p>
      </div>
    </div>
  );
}
