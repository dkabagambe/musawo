import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "materials.upload")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    title,
    blockId,
    type,
    bunnyVideoId,
    notesS3Key,
    isFreePreview,
    durationSec,
    transcript,
  } = body;

  if (!title || !blockId || !type) {
    return NextResponse.json(
      { error: "title, blockId, and type are required" },
      { status: 400 }
    );
  }

  if (type === "VIDEO" && !bunnyVideoId) {
    return NextResponse.json(
      { error: "bunnyVideoId is required for video materials" },
      { status: 400 }
    );
  }

  if (type === "NOTES" && !notesS3Key) {
    return NextResponse.json(
      { error: "notesS3Key is required for notes materials" },
      { status: 400 }
    );
  }

  try {
    // Verify block exists
    const block = await db.block.findUnique({
      where: { id: blockId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            courseCode: true,
          },
        },
      },
    });

    if (!block) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    // Get the next order number for this block
    const maxOrderLesson = await db.lesson.findFirst({
      where: { blockId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const nextOrder = (maxOrderLesson?.order ?? 0) + 1;

    // Create the lesson
    const lesson = await db.lesson.create({
      data: {
        blockId,
        order: nextOrder,
        title,
        type,
        bunnyVideoId: type === "VIDEO" ? bunnyVideoId : null,
        notesS3Key: type === "NOTES" ? notesS3Key : null,
        isFreePreview: isFreePreview || false,
        durationSec: durationSec || null,
        transcript: transcript || null,
        visibleScope: "ENROLLED", // Default to enrolled students only
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "MATERIAL_UPLOADED",
        resource: "LESSONS",
        resourceId: lesson.id,
        details: {
          lessonId: lesson.id,
          title,
          type,
          blockId,
          blockTitle: block.title,
          courseId: block.courseId,
          courseCode: block.course.courseCode,
          courseTitle: block.course.title,
        },
      },
    });

    return NextResponse.json({
      success: true,
      lesson: {
        id: lesson.id,
        title: lesson.title,
        type: lesson.type,
      },
    });
  } catch (error) {
    console.error("Material upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload material" },
      { status: 500 }
    );
  }
}
