import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  eventDate: z.string(),
  endDate: z.string().optional(),
  eventType: z.enum(["INTAKE", "EXAM_PERIOD", "HOLIDAY", "OTHER"]),
  isAllDay: z.boolean().default(true),
});

const updateEventSchema = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  eventDate: z.string().optional(),
  endDate: z.string().optional(),
  eventType: z.enum(["INTAKE", "EXAM_PERIOD", "HOLIDAY", "OTHER"]).optional(),
  isAllDay: z.boolean().optional(),
});

// GET /api/principal/calendar - List all calendar events
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: any = {};
  if (from) {
    where.eventDate = { gte: new Date(from) };
  }
  if (to) {
    where.eventDate = { ...where.eventDate, lte: new Date(to) };
  }

  const events = await db.calendarEvent.findMany({
    where,
    orderBy: { eventDate: "asc" },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json(events);
}

// POST /api/principal/calendar - Create new calendar event
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = createEventSchema.parse(body);

    const event = await db.calendarEvent.create({
      data: {
        title: validated.title,
        description: validated.description,
        eventDate: new Date(validated.eventDate),
        endDate: validated.endDate ? new Date(validated.endDate) : null,
        eventType: validated.eventType,
        isAllDay: validated.isAllDay,
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "CalendarEvent",
        entityId: event.id,
        details: `Created calendar event: ${event.title}`,
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to create calendar event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/principal/calendar - Update calendar event
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = updateEventSchema.parse(body);

    const existing = await db.calendarEvent.findUnique({
      where: { id: validated.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.eventDate !== undefined) updateData.eventDate = new Date(validated.eventDate);
    if (validated.endDate !== undefined) {
      updateData.endDate = validated.endDate ? new Date(validated.endDate) : null;
    }
    if (validated.eventType !== undefined) updateData.eventType = validated.eventType;
    if (validated.isAllDay !== undefined) updateData.isAllDay = validated.isAllDay;

    const event = await db.calendarEvent.update({
      where: { id: validated.id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "CalendarEvent",
        entityId: event.id,
        details: `Updated calendar event: ${event.title}`,
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to update calendar event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/principal/calendar - Delete calendar event
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    const existing = await db.calendarEvent.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await db.calendarEvent.delete({
      where: { id },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entity: "CalendarEvent",
        entityId: id,
        details: `Deleted calendar event: ${existing.title}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete calendar event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
