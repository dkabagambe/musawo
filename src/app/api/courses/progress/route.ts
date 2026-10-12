import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId, completed, watchPercent } = await req.json() as {
    lessonId: string;
    completed?: boolean;
    watchPercent?: number;
  };

  if (!lessonId) return NextResponse.json({ error: "Missing lessonId" }, { status: 400 });

  // Verify lesson exists and student has access
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { block: { include: { course: { include: {
      enrolments: { where: { userId: session.user.id, status: "ACTIVE" } },
    } } } } },
  });

  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const enrolment = lesson.block.course.enrolments[0];
  const blockUnlocked =
    lesson.isFree ||
    (enrolment && (lesson.block.order <= enrolment.unlockedBlockOrder || enrolment.unlockedBlockOrder >= 9999));

  if (!blockUnlocked) return NextResponse.json({ error: "Lesson not unlocked" }, { status: 403 });

  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId: session.user.id, lessonId } },
    update: {
      completedAt: completed ? new Date() : undefined,
      watchPercent: watchPercent ?? undefined,
    },
    create: {
      userId: session.user.id,
      lessonId,
      completedAt: completed ? new Date() : null,
      watchPercent: watchPercent ?? 0,
    },
  });

  // Check if all lessons in the course are done → mark course COMPLETED
  if (completed) {
    const course = lesson.block.course;
    const totalLessons = await db.lesson.count({
      where: { block: { courseId: course.id } },
    });
    const doneCount = await db.lessonProgress.count({
      where: { userId: session.user.id, completedAt: { not: null }, lesson: { block: { courseId: course.id } } },
    });
    if (doneCount >= totalLessons && enrolment) {
      await db.enrolment.update({
        where: { id: enrolment.id },
        data: { status: "COMPLETED" },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
