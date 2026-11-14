/**
 * GET   /api/tutor/assignments/[id]/submissions  - list submissions for an assignment
 * PATCH /api/tutor/assignments/[id]/submissions  - grade a submission
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { z } from "zod";

const GradeSchema = z.object({
  submissionId: z.string().cuid(),
  grade:        z.number().int().min(0).max(100),
  feedback:     z.string().max(2000).optional().nullable(),
});

async function getAssignmentForTutor(assignmentId: string, tutorId: string) {
  return db.assignment.findFirst({
    where: {
      id: assignmentId,
      course: teachingCourseWhere(tutorId),
    },
    select: { id: true, courseId: true, maxPoints: true, title: true },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "exams.mark"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const assignment = await getAssignmentForTutor(params.id, session.user.id);
  if (!assignment)
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

  const submissions = await db.assignmentSubmission.findMany({
    where: { assignmentId: params.id },
    orderBy: { submittedAt: "asc" },
    include: {
      user: { select: { id: true, name: true, studentNumber: true } },
    },
  });

  return NextResponse.json({ assignment, submissions });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "exams.mark"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const assignment = await getAssignmentForTutor(params.id, session.user.id);
  if (!assignment)
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

  const body = await req.json() as Record<string, unknown>;

  // Handle "return to student" action separately
  if (body.returned === true) {
    const sub = await db.assignmentSubmission.findFirst({
      where: { id: body.submissionId as string, assignmentId: params.id },
      select: { id: true, userId: true, grade: true },
    });
    if (!sub) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    if (sub.grade === null) return NextResponse.json({ error: "Grade the submission before returning it." }, { status: 400 });

    await db.assignmentSubmission.update({
      where: { id: sub.id },
      data: { status: "RETURNED" },
    });

    // Notify student
    await db.notification.create({
      data: {
        userId: sub.userId,
        channel: "IN_APP",
        type: "EXAM_RESULT",
        subject: `Assignment returned: ${assignment.title}`,
        body: `Your submission for "${assignment.title}" has been graded and returned. Score: ${sub.grade}/${assignment.maxPoints}.`,
        metadata: { assignmentId: params.id, submissionId: sub.id, grade: sub.grade },
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true, status: "RETURNED" });
  }

  // Handle "close / reopen" action
  if (body.action === "close" || body.action === "reopen") {
    await db.assignment.update({
      where: { id: params.id },
      data: { status: body.action === "close" ? "CLOSED" : "PUBLISHED" },
    });
    return NextResponse.json({ ok: true });
  }

  // Standard grading
  const parsed = GradeSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const { submissionId, grade, feedback } = parsed.data;

  if (grade > assignment.maxPoints)
    return NextResponse.json({ error: `Grade cannot exceed max points (${assignment.maxPoints})` }, { status: 400 });

  const sub = await db.assignmentSubmission.findFirst({
    where: { id: submissionId, assignmentId: params.id },
    select: { id: true, userId: true },
  });
  if (!sub)
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  const updated = await db.assignmentSubmission.update({
    where: { id: submissionId },
    data: { grade, feedback: feedback ?? null, gradedAt: new Date(), status: "GRADED" },
  });

  // Notify the student
  await db.notification.create({
    data: {
      userId: sub.userId,
      channel: "IN_APP",
      type: "EXAM_RESULT",
      subject: `Assignment graded: ${assignment.title}`,
      body: `You scored ${grade}/${assignment.maxPoints} on "${assignment.title}".${feedback ? ` Feedback: ${feedback}` : ""}`,
      metadata: { assignmentId: params.id, submissionId, grade },
    },
  }).catch(() => {});

  return NextResponse.json({ submission: updated });
}
