import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const observeSchema = z.object({
  classId: z.string(),
});

/**
 * POST /api/principal/classes/observe
 * Log when a Principal joins a live class as an observer
 * This action is audited as per P6.2 requirements
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = observeSchema.parse(body);

    // Get class details
    const liveClass = await db.liveClass.findUnique({
      where: { id: validated.classId },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        status: true,
        course: { select: { title: true } },
        tutor: { select: { name: true } },
      },
    });

    if (!liveClass) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Create audit log for observer join
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "OBSERVE",
        entity: "LiveClass",
        entityId: liveClass.id,
        details: `Principal ${session.user.name} joined as observer: ${liveClass.title} (${liveClass.course.title}) - Instructor: ${liveClass.tutor.name}`,
        metadata: JSON.stringify({
          classId: liveClass.id,
          classTitle: liveClass.title,
          courseTitle: liveClass.course.title,
          instructorName: liveClass.tutor.name,
          scheduledAt: liveClass.scheduledAt,
          observedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to log observer join:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
