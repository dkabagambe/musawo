import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import ExamSession from "./ExamSession";
import ExamWaitingRoom from "./ExamWaitingRoom";
export const dynamic = "force-dynamic";


interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props) {
  const exam = await db.exam.findUnique({
    where: { id: params.id },
    select: { title: true },
  });
  return { title: exam ? `${exam.title} - Exam` : "Exam" };
}

export default async function ExamPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const exam = await db.exam.findUnique({
    where: { id: params.id, status: "PUBLISHED" },
    include: {
      course: { select: { title: true, slug: true } },
      block: { select: { order: true } },
    },
  });

  if (!exam) notFound();

  // Check enrolment and payment status
  const enrolment = await db.enrolment.findFirst({
    where: {
      userId: session.user.id,
      courseId: exam.courseId,
    },
    select: {
      id: true,
      status: true,
      paidPercent: true,
      provisionalUntil: true,
      graceUntil: true,
      overdueSince: true,
    },
  });

  if (!enrolment) redirect(`/courses/${exam.course.slug}`);

  const { getAccessLevel } = await import("@/lib/enrolment/access");
  const accessLevel = getAccessLevel({
    status: enrolment.status,
    paidPercent: enrolment.paidPercent,
    provisionalUntil: enrolment.provisionalUntil,
    graceUntil: enrolment.graceUntil,
    overdueSince: enrolment.overdueSince,
  });

  // Determine required payment threshold based on block order
  const blockOrder = exam.block?.order ?? 1;
  const requiredPct = blockOrder >= 3 ? 100 : 75;
  const pct = enrolment.paidPercent;
  const isLocked =
    accessLevel !== "FULL" &&
    accessLevel !== "COMPLETED" &&
    pct < requiredPct;

  if (isLocked) {
    const lockedReason =
      pct < 50
        ? "Pay 50% to start your course and access exams"
        : pct < 75
        ? `Pay 25% more to unlock this exam. You have paid ${pct}%.`
        : `Pay in full to unlock this exam and earn your certificate. You have paid ${pct}%.`;
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center py-10">
          <p className="text-4xl mb-4" aria-hidden="true">🔒</p>
          <h1 className="text-xl font-bold mb-2">Exam locked</h1>
          <p className="text-sm text-gray-500 mb-4">{lockedReason}</p>
          <a href="/dashboard/payments" className="btn-primary no-underline">
            Go to My Fees
          </a>
        </div>
      </div>
    );
  }

  // Waiting room: startWindowAt is in the future
  const now = new Date();
  if (exam.startWindowAt && exam.startWindowAt > now) {
    return (
      <ExamWaitingRoom
        examTitle={exam.title}
        courseTitle={exam.course.title}
        startWindowAt={exam.startWindowAt.toISOString()}
      />
    );
  }

  // Check attempt limit
  const attemptCount = await db.examAttempt.count({
    where: { examId: params.id, userId: session.user.id },
  });

  const hasActiveAttempt = await db.examAttempt.findFirst({
    where: { examId: params.id, userId: session.user.id, status: "IN_PROGRESS" },
  });

  if (attemptCount >= exam.attemptLimit && !hasActiveAttempt) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center py-10">
          <p className="text-4xl mb-4" aria-hidden="true">🚫</p>
          <h1 className="text-xl font-bold mb-2">Attempt limit reached</h1>
          <p className="text-sm text-gray-500 mb-4">
            You have used all {exam.attemptLimit} attempt{exam.attemptLimit !== 1 ? "s" : ""} for this exam.
          </p>
          <a href="/dashboard/results" className="btn-primary no-underline">
            View my results
          </a>
        </div>
      </div>
    );
  }

  return (
    <ExamSession
      examId={exam.id}
      examTitle={exam.title}
      courseTitle={exam.course.title}
      passPercent={exam.passPercent}
    />
  );
}
