import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, canVia } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";

const DateRangeFields = {
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
};

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("venue"),
    name: z.string().min(2).max(100),
    location: z.string().max(200).optional(),
    capacity: z.number().int().positive().optional(),
    notes: z.string().max(1000).optional(),
  }),
  z.object({
    action: z.literal("booking"),
    venueId: z.string().cuid(),
    title: z.string().min(2).max(160),
    ...DateRangeFields,
    notes: z.string().max(1000).optional(),
  }),
  z.object({
    action: z.literal("practical"),
    venueId: z.string().cuid(),
    title: z.string().min(2).max(160),
    courseName: z.string().max(160).optional(),
    ...DateRangeFields,
    notes: z.string().max(1000).optional(),
    equipment: z
      .array(
        z.object({
          name: z.string().min(1).max(120),
          needed: z.number().int().positive(),
          available: z.number().int().min(0).default(0),
          notes: z.string().max(500).optional(),
        }),
      )
      .max(50)
      .default([]),
  }),
  z.object({
    action: z.literal("equipment"),
    itemId: z.string().cuid(),
    available: z.number().int().min(0),
    notes: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("notice"),
    title: z.string().min(3).max(160),
    body: z.string().min(5).max(2000),
    audience: z.enum(["ALL", "STUDENTS", "STAFF"]),
    channel: z.enum(["IN_APP", "EMAIL"]).default("IN_APP"),
  }),
]);

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (
    ![
      "venues.manage",
      "bookings.manage",
      "practicals.manage",
      "equipment.manage",
      "operational_notices.manage",
      "reports.operational",
    ].some((permission) =>
      can(session.user.role, permission as Parameters<typeof can>[1]),
    )
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const [venues, bookings, practicals, notices] = await Promise.all([
    db.venue.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.venueBooking.findMany({
      where: { startsAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      include: { venue: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
      take: 100,
    }),
    db.practicalSession.findMany({
      where: { startsAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      include: { venue: { select: { name: true } }, equipment: true },
      orderBy: { startsAt: "asc" },
      take: 100,
    }),
    db.operationalNotice.findMany({ orderBy: { sentAt: "desc" }, take: 30 }),
  ]);
  return NextResponse.json({ venues, bookings, practicals, notices });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = ActionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  const data = parsed.data;

  if (data.action === "venue") {
    if (!can(session.user.role, "venues.manage"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const venue = await db.venue.create({
      data: {
        name: data.name,
        location: data.location,
        capacity: data.capacity,
        notes: data.notes,
      },
    });
    await audit({
      actorId: session.user.id,
      action: "CREATE",
      entityType: "Venue",
      entityId: venue.id,
      metadata: { via: canVia(session.user.role, "venues.manage") },
    });
    return NextResponse.json({ venue }, { status: 201 });
  }

  if (data.action === "booking" || data.action === "practical") {
    const permission =
      data.action === "booking" ? "bookings.manage" : "practicals.manage";
    if (!can(session.user.role, permission))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);
    if (endsAt <= startsAt) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 },
      );
    }
    const venue = await db.venue.findUnique({
      where: { id: data.venueId, active: true },
    });
    if (!venue)
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    const [bookingConflict, practicalConflict] = await Promise.all([
      db.venueBooking.findFirst({
        where: {
          venueId: data.venueId,
          status: "CONFIRMED",
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { id: true },
      }),
      db.practicalSession.findFirst({
        where: {
          venueId: data.venueId,
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { id: true },
      }),
    ]);
    if (bookingConflict || practicalConflict)
      return NextResponse.json(
        { error: "This room is already booked for part of that time." },
        { status: 409 },
      );

    if (data.action === "booking") {
      const booking = await db.venueBooking.create({
        data: {
          venueId: data.venueId,
          title: data.title,
          startsAt,
          endsAt,
          notes: data.notes,
          createdById: session.user.id,
        },
      });
      await audit({
        actorId: session.user.id,
        action: "CREATE",
        entityType: "VenueBooking",
        entityId: booking.id,
        metadata: { via: canVia(session.user.role, "bookings.manage") },
      });
      return NextResponse.json({ booking }, { status: 201 });
    }
    const practical = await db.practicalSession.create({
      data: {
        venueId: data.venueId,
        title: data.title,
        courseName: data.courseName,
        startsAt,
        endsAt,
        notes: data.notes,
        createdById: session.user.id,
        equipment: { create: data.equipment },
      },
      include: { equipment: true },
    });
    await audit({
      actorId: session.user.id,
      action: "CREATE",
      entityType: "PracticalSession",
      entityId: practical.id,
      metadata: { via: canVia(session.user.role, "practicals.manage") },
    });
    return NextResponse.json({ practical }, { status: 201 });
  }

  if (data.action === "equipment") {
    if (!can(session.user.role, "equipment.manage"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const item = await db.practicalEquipmentItem.update({
      where: { id: data.itemId },
      data: { available: data.available, notes: data.notes },
    });
    await audit({
      actorId: session.user.id,
      action: "UPDATE",
      entityType: "PracticalEquipmentItem",
      entityId: item.id,
      metadata: {
        available: item.available,
        via: canVia(session.user.role, "equipment.manage"),
      },
    });
    return NextResponse.json({ item });
  }

  if (!can(session.user.role, "operational_notices.manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const activeUsers = await db.user.findMany({
    where: { status: "ACTIVE", email: { not: null } },
    select: { id: true, name: true, email: true, role: true },
  });
  const recipients = activeUsers.filter((user) => {
    const student = can(user.role, "learning.self.view");
    const staff = can(user.role, "support.submit") && !student;
    return (
      data.audience === "ALL" ||
      (data.audience === "STUDENTS" && student) ||
      (data.audience === "STAFF" && staff)
    );
  });
  const notice = await db.operationalNotice.create({
    data: {
      title: data.title,
      body: data.body,
      audience: data.audience,
      channel: data.channel,
      sentById: session.user.id,
    },
  });
  await db.notification.createMany({
    data: recipients.map((recipient) => ({
      userId: recipient.id,
      channel: "IN_APP" as const,
      type: "OPERATIONAL_NOTICE",
      subject: data.title,
      body: data.body,
      metadata: { noticeId: notice.id },
    })),
  });
  if (data.channel === "EMAIL") {
    await Promise.all(
      recipients
        .filter((recipient) => recipient.email)
        .map((recipient) =>
          sendEmail({
            to: recipient.email!,
            subject: data.title,
            template: "operational-notice",
            variables: {
              name: escapeHtml(recipient.name),
              title: escapeHtml(data.title),
              body: escapeHtml(data.body).replaceAll("\n", "<br />"),
            },
          }),
        ),
    );
  }
  await audit({
    actorId: session.user.id,
    action: "OPERATIONAL_NOTICE_SENT",
    entityType: "OperationalNotice",
    entityId: notice.id,
    metadata: {
      audience: data.audience,
      channel: data.channel,
      recipientCount: recipients.length,
      via: canVia(session.user.role, "operational_notices.manage"),
    },
  });
  return NextResponse.json(
    { notice, recipientCount: recipients.length },
    { status: 201 },
  );
}
