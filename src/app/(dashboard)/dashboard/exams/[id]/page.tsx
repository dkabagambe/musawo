import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import ExamSession from "./ExamSession";

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
    },
  });

  if (!exam) notFound();

  // Check enrolment
  const enrolment = await db.enrolment.findFirst({
    where: {
      userId: session.user.id,
      courseId: exam.courseId,
      status: "ACTIVE",
    },
  });

  if (!enrolment) redirect(`/courses/${exam.course.slug}`);

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
