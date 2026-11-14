/**
 * GET /api/lesson/[id]/view
 * Returns a presigned S3 URL for tutor (instructor) to preview a lesson file.
 * The redirect URL will expire in 60 seconds.
 * Access limited to: enrolled students (via their portal) and the course's instructors.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { getPresignedDownloadUrl } from "@/lib/s3/index";
import { can } from "@/lib/rbac";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lesson = await db.lesson.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      notesS3Key: true,
      block: { select: { courseId: true } },
    },
  });

  if (!lesson || !lesson.notesS3Key) {
    return NextResponse.json({ error: "Lesson not found or has no file." }, { status: 404 });
  }

  // Must be the instructor for this course
  const isInstructor = can(session.user.role, "content.upload");
  if (isInstructor) {
    const course = await db.course.findFirst({
      where: { id: lesson.block.courseId, ...teachingCourseWhere(session.user.id) },
      select: { id: true },
    });
    if (!course) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else {
    // Student: must be enrolled
    const enrolment = await db.enrolment.findFirst({
      where: {
        userId: session.user.id,
        courseId: lesson.block.courseId,
        status: { in: ["ACTIVE", "COMPLETED", "PARTIALLY_PAID"] },
      },
      select: { id: true },
    });
    if (!enrolment) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = await getPresignedDownloadUrl(lesson.notesS3Key, 60);
  return NextResponse.redirect(url);
}
