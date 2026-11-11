import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { getInlineObject } from "@/lib/s3";
import { getAccessLevel, canAccessLesson } from "@/lib/enrolment/access";

/**
 * GET /api/learning/materials/[id]
 * Serve a lesson's notes PDF with payment gate enforcement.
 * Students can only access lessons they have paid for.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const lesson = await db.lesson.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      notesS3Key: true,
      isFree: true,
      isFreePreview: true,
      block: {
        select: {
          order: true,
          courseId: true,
        },
      },
    },
  });

  if (!lesson || !lesson.notesS3Key) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Check enrolment and payment status
  const enrolment = await db.enrolment.findUnique({
    where: {
      userId_courseId: {
        userId: session.user.id,
        courseId: lesson.block.courseId,
      },
    },
    select: {
      status: true,
      paidPercent: true,
      provisionalUntil: true,
      graceUntil: true,
      overdueSince: true,
      unlockedBlockOrder: true,
    },
  });

  // Check access
  const canView = canAccessLesson(
    { isFree: lesson.isFree, isFreePreview: lesson.isFreePreview },
    { order: lesson.block.order },
    enrolment
      ? {
          status: enrolment.status,
          paidPercent: enrolment.paidPercent,
          provisionalUntil: enrolment.provisionalUntil,
          graceUntil: enrolment.graceUntil,
          overdueSince: enrolment.overdueSince,
          unlockedBlockOrder: enrolment.unlockedBlockOrder,
        }
      : null
  );

  if (!canView) {
    return new NextResponse("Payment required", { status: 402 });
  }

  // Fetch from S3 and stream
  try {
    const { body, contentType } = await getInlineObject(lesson.notesS3Key);
    return new NextResponse(body as ReadableStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(lesson.title)}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Failed to fetch lesson notes:", err);
    return new NextResponse("File not found", { status: 404 });
  }
}
