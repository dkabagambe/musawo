import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  courseId: z.string().min(1),
  blockId: z.string().optional(),
  tutorId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  scheduledAt: z.string(), // ISO datetime string
  durationMin: z.number().int().min(15).max(480),
  venue: z.string().default("Online"),
  joinUrl: z.string().url(),
});

const updateSchema = createSchema.extend({
  id: z.string().min(1),
});

const deleteSchema = z.object({
  id: z.string().min(1),
  cancelReason: z.string().min(10),
});

/**
 * POST /api/principal/timetable
 * Create a new live class
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !can(session.user.role, "courses.edit")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = createSchema.parse(body);

    // Create the live class
    const liveClass = await db.liveClass.create({
      data: {
        courseId: data.courseId,
        blockId: data.blockId || null,
        tutorId: data.tutorId,
        title: data.title,
        description: data.description,
        scheduledAt: new Date(data.scheduledAt),
        durationMin: data.durationMin,
        venue: data.venue,
        joinUrl: data.joinUrl,
        status: "SCHEDULED",
      },
      include: {
        course: { select: { title: true } },
        tutor: { select: { name: true, email: true } },
      },
    });

    // Audit log
    await auditLog({
      action: "CREATE",
      resource: "live_class",
      resourceId: liveClass.id,
      userId: session.user.id,
      details: {
        title: liveClass.title,
        course: liveClass.course.title,
        tutor: liveClass.tutor.name,
        scheduledAt: liveClass.scheduledAt.toISOString(),
        durationMin: liveClass.durationMin,
        venue: liveClass.venue,
      },
    });

    // TODO: Send notifications to instructor and enrolled students
    // This would typically create notification records and/or send emails

    return NextResponse.json(liveClass, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.errors },
        { status: 400 },
      );
    }
    console.error("Failed to create live class:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/principal/timetable
 * Update an existing live class
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !can(session.user.role, "courses.edit")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    // Get the existing class for comparison
    const existing = await db.liveClass.findUnique({
      where: { id: data.id },
      include: {
        course: { select: { title: true } },
        tutor: { select: { name: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    if (existing.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: "Can only edit scheduled classes" },
        { status: 400 },
      );
    }

    // Check if it's a reschedule
    const isReschedule = new Date(data.scheduledAt).getTime() !== existing.scheduledAt.getTime();

    // Update the class
    const updated = await db.liveClass.update({
      where: { id: data.id },
      data: {
        courseId: data.courseId,
        blockId: data.blockId || null,
        tutorId: data.tutorId,
        title: data.title,
        description: data.description,
        scheduledAt: new Date(data.scheduledAt),
        durationMin: data.durationMin,
        venue: data.venue,
        joinUrl: data.joinUrl,
        originalScheduledAt: isReschedule ? existing.scheduledAt : existing.originalScheduledAt,
        rescheduleReason: isReschedule
          ? `Rescheduled from ${existing.scheduledAt.toISOString()}`
          : existing.rescheduleReason,
      },
      include: {
        course: { select: { title: true } },
        tutor: { select: { name: true } },
      },
    });

    // Audit log
    await auditLog({
      action: "UPDATE",
      resource: "live_class",
      resourceId: updated.id,
      userId: session.user.id,
      details: {
        title: updated.title,
        isReschedule,
        originalTime: existing.scheduledAt.toISOString(),
        newTime: updated.scheduledAt.toISOString(),
        changes: {
          tutor: existing.tutorId !== updated.tutorId,
          duration: existing.durationMin !== updated.durationMin,
          venue: existing.venue !== updated.venue,
        },
      },
    });

    // TODO: Send notifications about the change
    if (isReschedule) {
      // Notify instructor and students about reschedule
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.errors },
        { status: 400 },
      );
    }
    console.error("Failed to update live class:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/principal/timetable
 * Cancel a live class (sets status to CANCELLED)
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !can(session.user.role, "courses.edit")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = deleteSchema.parse(body);

    // Get the existing class
    const existing = await db.liveClass.findUnique({
      where: { id: data.id },
      include: {
        course: { select: { title: true } },
        tutor: { select: { name: true, email: true } },
        _count: { select: { attendance: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    if (existing.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: "Can only cancel scheduled classes" },
        { status: 400 },
      );
    }

    // Cancel the class (update status)
    const cancelled = await db.liveClass.update({
      where: { id: data.id },
      data: {
        status: "CANCELLED",
        cancelReason: data.cancelReason,
      },
      include: {
        course: { select: { title: true } },
        tutor: { select: { name: true } },
      },
    });

    // Audit log
    await auditLog({
      action: "DELETE",
      resource: "live_class",
      resourceId: cancelled.id,
      userId: session.user.id,
      details: {
        title: cancelled.title,
        course: cancelled.course.title,
        tutor: cancelled.tutor.name,
        scheduledAt: cancelled.scheduledAt.toISOString(),
        cancelReason: data.cancelReason,
        affectedStudents: existing._count.attendance,
      },
    });

    // TODO: Send cancellation notifications to instructor and enrolled students

    return NextResponse.json({ success: true, cancelled });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.errors },
        { status: 400 },
      );
    }
    console.error("Failed to cancel live class:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
