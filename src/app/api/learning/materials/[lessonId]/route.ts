import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getInlineObject } from "@/lib/s3";
import { canAccessLesson } from "@/lib/enrolment/access";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { lessonId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lesson = await db.lesson.findUnique({
    where: { id: params.lessonId },
    include: { block: { include: { course: { select: { id: true, accessThresholds: true } } } } },
  });
  if (!lesson?.notesS3Key) return NextResponse.json({ error: "Material not found" }, { status: 404 });

  const enrolment = await db.enrolment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId: lesson.block.course.id } },
  });
  const permitted = canAccessLesson(
    { isFree: lesson.isFree, isFreePreview: lesson.isFreePreview },
    { order: lesson.block.order },
    enrolment ? {
      status: enrolment.status,
      paidPercent: enrolment.paidPercent,
      provisionalUntil: enrolment.provisionalUntil,
      graceUntil: enrolment.graceUntil,
      overdueSince: enrolment.overdueSince,
      unlockedBlockOrder: enrolment.unlockedBlockOrder,
    } : null,
  );
  if (!permitted) return NextResponse.json({ error: "This material is locked" }, { status: 403 });

  const object = await getInlineObject(lesson.notesS3Key);
  return new NextResponse(object.body, {
    headers: {
      "Content-Type": object.contentType === "application/pdf" ? "application/pdf" : "application/octet-stream",
      "Content-Disposition": `inline; filename="${lesson.title.replace(/[^a-zA-Z0-9 _-]/g, "")}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      ...(object.contentLength ? { "Content-Length": String(object.contentLength) } : {}),
    },
  });
}
