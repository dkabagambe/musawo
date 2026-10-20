import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, ForbiddenError, requirePermission } from "@/lib/rbac";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { audit } from "@/lib/audit";

const Schema = z.object({ attemptId: z.string().cuid(), questionId: z.string().cuid(), score: z.number().int().min(0), feedback: z.string().max(5000).optional() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "exams.mark"); }
  catch (error) { if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 }); throw error; }
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid mark" }, { status: 400 });
  const attempt = await db.examAttempt.findFirst({
    where: { id: parsed.data.attemptId, status: "SUBMITTED", exam: { course: teachingCourseWhere(session.user.id) } },
    include: { exam: { include: { questions: true } }, shortAnswerReviews: true },
  });
  if (!attempt) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  const question = attempt.exam.questions.find((item) => item.id === parsed.data.questionId);
  if (!question || question.type !== "SHORT_ANSWER") return NextResponse.json({ error: "Reviewable question not found" }, { status: 404 });
  if (parsed.data.score > question.points) return NextResponse.json({ error: `Score cannot exceed ${question.points}.` }, { status: 400 });

  await db.shortAnswerReview.upsert({
    where: { attemptId_questionId: { attemptId: attempt.id, questionId: question.id } },
    create: { attemptId: attempt.id, questionId: question.id, tutorId: session.user.id, score: parsed.data.score, feedback: parsed.data.feedback },
    update: { tutorId: session.user.id, score: parsed.data.score, feedback: parsed.data.feedback, reviewedAt: new Date() },
  });
  const reviews = await db.shortAnswerReview.findMany({ where: { attemptId: attempt.id }, select: { questionId: true, score: true } });
  const shortQuestions = attempt.exam.questions.filter((item) => item.type === "SHORT_ANSWER");
  const complete = shortQuestions.every((item) => reviews.some((review) => review.questionId === item.id));
  if (complete) {
    const manualScore = reviews.reduce((sum, review) => sum + review.score, 0);
    const score = (attempt.score ?? 0) + manualScore;
    const maxScore = attempt.maxScore ?? attempt.exam.questions.reduce((sum, item) => sum + item.points, 0);
    await db.examAttempt.update({ where: { id: attempt.id }, data: { score, status: "MARKED", passed: maxScore > 0 && (score / maxScore) * 100 >= attempt.exam.passPercent } });
    await db.notification.create({ data: { userId: attempt.userId, channel: "IN_APP", type: "EXAM_MARKED", subject: `Results available: ${attempt.exam.title}`, body: "Your exam submission has been marked." } });
  }
  await audit({ actorId: session.user.id, action: "UPDATE", entityType: "ExamAttempt", entityId: attempt.id, metadata: { questionId: question.id, score: parsed.data.score, allManualQuestionsReviewed: complete } });
  return NextResponse.json({ saved: true, complete });
}
