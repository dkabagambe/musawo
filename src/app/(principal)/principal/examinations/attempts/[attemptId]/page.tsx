import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import AttemptMonitor from "./AttemptMonitor";
export const dynamic = "force-dynamic";

export const metadata = { title: "Monitor Exam Attempt - Principal" };

interface Props {
  params: { attemptId: string };
}

export default async function AttemptMonitorPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "exams.mark")) redirect("/403");

  const attempt = await db.examAttempt.findUnique({
    where: { id: params.attemptId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          studentNumber: true,
        },
      },
      exam: {
        select: {
          id: true,
          title: true,
          timeLimitMin: true,
          perQuestionSec: true,
          passPercent: true,
          course: { select: { id: true, title: true, courseCode: true } },
        },
      },
    },
  });

  if (!attempt) {
    notFound();
  }

  // Calculate time remaining
  let timeRemaining: number | null = null;
  if (attempt.timeLimitEndsAt) {
    const now = new Date();
    const endsAt = new Date(attempt.timeLimitEndsAt);
    timeRemaining = Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 1000));
  }

  return (
    <AttemptMonitor
      attempt={attempt}
      timeRemaining={timeRemaining}
      userId={session.user.id}
      canControl={can(session.user.role, "exams.mark")}
    />
  );
}
