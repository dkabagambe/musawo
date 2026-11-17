import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export async function POST(
  request: Request,
  { params }: { params: { materialId: string } }
) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "materials.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { materialId } = params;
  const body = await request.json();
  const { reason } = body;

  if (!reason || reason.trim().length < 10) {
    return NextResponse.json(
      { error: "Reason is required (minimum 10 characters)" },
      { status: 400 }
    );
  }

  try {
    // Verify lesson exists and is archived
    const lesson = await db.lesson.findUnique({
      where: { id: materialId },
      include: {
        block: {
          select: {
            title: true,
            course: {
              select: {
                title: true,
                courseCode: true,
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    if (!lesson.archivedAt) {
      return NextResponse.json(
        { error: "Material is not archived" },
        { status: 400 }
      );
    }

    // Restore the lesson
    const updated = await db.lesson.update({
      where: { id: materialId },
      data: {
        archivedAt: null,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "MATERIAL_RESTORED",
        resource: "LESSONS",
        resourceId: materialId,
        details: {
          lessonId: materialId,
          title: lesson.title,
          type: lesson.type,
          blockTitle: lesson.block.title,
          courseCode: lesson.block.course.courseCode,
          courseTitle: lesson.block.course.title,
          reason,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Material restored successfully",
    });
  } catch (error) {
    console.error("Restore material error:", error);
    return NextResponse.json(
      { error: "Failed to restore material" },
      { status: 500 }
    );
  }
}
