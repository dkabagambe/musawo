import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const updateAttendanceSchema = z.object({
  attendanceId: z.string(),
  markedPresent: z.boolean(),
  editReason: z.string().min(10, "Reason must be at least 10 characters"),
});

/**
 * PATCH /api/principal/attendance
 * Edit an attendance record with a reason (audited)
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = updateAttendanceSchema.parse(body);

    // Get existing record
    const existing = await db.attendance.findUnique({
      where: { id: validated.attendanceId },
      include: {
        user: { select: { name: true, studentNumber: true } },
        liveClass: {
          select: {
            title: true,
            scheduledAt: true,
            course: { select: { title: true } },
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    // Record before state for audit
    const beforeState = {
      markedPresent: existing.markedPresent,
    };

    // Update attendance
    const updated = await db.attendance.update({
      where: { id: validated.attendanceId },
      data: {
        markedPresent: validated.markedPresent,
        // Store edit reason in comment field (we could add a dedicated field for this)
        endComment: validated.editReason,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "Attendance",
        entityId: updated.id,
        details: `Attendance edited for ${existing.user.name} (${existing.user.studentNumber}) in ${existing.liveClass.title}. Changed from ${beforeState.markedPresent ? "Present" : "Absent"} to ${validated.markedPresent ? "Present" : "Absent"}. Reason: ${validated.editReason}`,
        before: JSON.stringify(beforeState),
        after: JSON.stringify({ markedPresent: validated.markedPresent }),
      },
    });

    return NextResponse.json({ success: true, attendance: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to update attendance:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
