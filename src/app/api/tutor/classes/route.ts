import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { z } from "zod";
import { canAccessTeachingCourse, teachingCourseWhere } from "@/lib/teaching/scope";
import { can } from "@/lib/rbac";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const CreateClassSchema = z.object({
  courseId: z.string().cuid(),
  blockId: z.string().cuid().optional(),
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  scheduledAt: z.string().datetime(),
  durationMin: z.number().int().min(15).max(480).default(60),
  joinUrl: z.string().url().optional(),
  platform: z.enum(["link", "bbb", "jitsi", "google_meet", "zoom"]).default("link"),
  selfCheckIn: z.boolean().default(false),
  venue: z.string().max(200).optional(),
  repeatWeeklyUntil: z.string().datetime().optional(),
});

const ClassActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    classId: z.string().cuid(),
  }),
  z.object({
    action: z.literal("stop"),
    classId: z.string().cuid(),
  }),
  z.object({
    action: z.literal("students_may_speak"),
    classId: z.string().cuid(),
    studentsMaySpeak: z.boolean(),
  }),
  z.object({
    action: z.literal("recording"),
    classId: z.string().cuid(),
    recordingUrl: z.string().url().refine((v) => v.startsWith("https://"), "Use an HTTPS replay link."),
  }),
  z.object({
    action: z.literal("edit"),
    classId: z.string().cuid(),
    title: z.string().min(3).max(200).optional(),
    description: z.string().max(1000).optional(),
    joinUrl: z.string().url().optional(),
    venue: z.string().max(200).optional(),
    durationMin: z.number().int().min(15).max(480).optional(),
  }),
  z.object({
    action: z.literal("reschedule"),
    classId: z.string().cuid(),
    newScheduledAt: z.string().datetime(),
    reason: z.string().min(3).max(500),
  }),
  z.object({
    action: z.literal("cancel"),
    classId: z.string().cuid(),
    reason: z.string().min(3).max(500),
  }),
]);

// ─── Conflict detection ───────────────────────────────────────────────────────

/**
 * Returns any SCHEDULED or LIVE classes for the same instructor (or same non-null
 * venue) that overlap with the requested time window.
 * excludeId: skip the class itself (for reschedule).
 */
async function detectConflicts(
  tutorId: string,
  startAt: Date,
  durationMin: number,
  venue: string | null | undefined,
  excludeId?: string,
) {
  const endAt = new Date(startAt.getTime() + durationMin * 60_000);

  const conflicts = await db.liveClass.findMany({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      status: { in: ["SCHEDULED", "LIVE"] },
      OR: [
        // same instructor overlap
        {
          tutorId,
          scheduledAt: { lt: endAt },
          // end time > startAt — Prisma can't do computed columns, use raw comparison
        },
        // same venue overlap (if venue is specified and non-empty)
        ...(venue
          ? [
              {
                venue,
                scheduledAt: { lt: endAt },
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      title: true,
      scheduledAt: true,
      durationMin: true,
      tutorId: true,
      venue: true,
    },
  });

  // Filter: only those whose END time is after the new START time
  return conflicts.filter((c) => {
    const cEnd = new Date(c.scheduledAt.getTime() + c.durationMin * 60_000);
    return cEnd > startAt;
  });
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "classes.view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format");

  // ICS calendar export
  if (format === "ics") {
    return handleICSExport(session.user.id, session.user.name ?? "Instructor");
  }

  const classes = await db.liveClass.findMany({
    where: { course: teachingCourseWhere(session.user.id) },
    orderBy: { scheduledAt: "desc" },
    include: {
      course: { select: { id: true, title: true } },
      block: { select: { id: true, title: true } },
      _count: { select: { attendance: true } },
    },
  });

  // Merge extra raw columns (studentsMaySpeak, recordingStatus, recordingEnabled)
  const { Prisma } = await import("@prisma/client");
  const settings = classes.length
    ? await db.$queryRaw<
        Array<{ id: string; studentsMaySpeak: boolean; recordingStatus: string; recordingEnabled: boolean }>
      >`SELECT id, "studentsMaySpeak", "recordingStatus", "recordingEnabled" FROM live_classes WHERE id IN (${Prisma.join(classes.map((item) => item.id))})`
    : [];
  const byId = new Map(settings.map((item) => [item.id, item]));

  return NextResponse.json({
    classes: classes.map((item) => ({
      ...item,
      studentCount: item._count.attendance,
      ...(byId.get(item.id) ?? {}),
    })),
  });
}

// ─── POST: create class ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    requirePermission(session.user.role, "classes.manage");
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: (e as Error).message }, { status: 403 });
    throw e;
  }

  const parsed = CreateClassSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { courseId, blockId, title, description, scheduledAt, durationMin, selfCheckIn, venue, repeatWeeklyUntil } =
    parsed.data;
  const platform =
    parsed.data.platform === "google_meet" || parsed.data.platform === "zoom"
      ? "link"
      : parsed.data.platform;
  const joinUrl = parsed.data.joinUrl;

  if (platform === "link" && !joinUrl)
    return NextResponse.json({ error: "A meeting link is required for this provider." }, { status: 400 });
  if (platform === "bbb" && (!process.env.BBB_URL || !process.env.BBB_SECRET))
    return NextResponse.json(
      { error: "BigBlueButton is not configured. Use a meeting link or ask IT to configure it." },
      { status: 503 },
    );
  if (platform === "jitsi" && process.env.JITSI_ENABLED !== "true")
    return NextResponse.json(
      { error: "Jitsi is disabled. Use a meeting link or ask IT to enable it." },
      { status: 503 },
    );

  if (!(await canAccessTeachingCourse(courseId, session.user.id)))
    return NextResponse.json({ error: "You are not assigned to this course." }, { status: 403 });

  if (blockId) {
    const block = await db.block.findFirst({ where: { id: blockId, courseId }, select: { id: true } });
    if (!block)
      return NextResponse.json({ error: "The selected unit does not belong to this course." }, { status: 400 });
  }

  const startAt = new Date(scheduledAt);

  // Conflict detection
  const conflicts = await detectConflicts(session.user.id, startAt, durationMin, venue);
  if (conflicts.length > 0) {
    return NextResponse.json(
      {
        error: `Scheduling conflict: "${conflicts[0].title}" is already scheduled at overlapping time${venue && conflicts[0].venue === venue ? " in the same venue" : ""}.`,
        conflicts: conflicts.map((c) => ({ id: c.id, title: c.title, scheduledAt: c.scheduledAt })),
      },
      { status: 409 },
    );
  }

  // Helper to create one class
  async function createOne(at: Date) {
    const lc = await db.liveClass.create({
      data: {
        courseId,
        blockId: blockId ?? null,
        tutorId: session.user.id,
        title,
        description: description ?? null,
        scheduledAt: at,
        durationMin,
        joinUrl: joinUrl ?? "",
        platform,
        status: "SCHEDULED",
        venue: venue ?? null,
      },
      include: { course: { select: { id: true, title: true } } },
    });
    const checkinOpensAt = selfCheckIn ? new Date(at.getTime() - 15 * 60_000) : null;
    const checkinClosesAt = selfCheckIn ? new Date(at.getTime() + 30 * 60_000) : null;
    await db.$executeRaw`UPDATE live_classes SET
      "recordingEnabled" = true,
      "minimumAttendancePercent" = (SELECT "minimumAttendancePercent" FROM courses WHERE id = ${courseId}),
      "selfCheckInOpensAt" = ${checkinOpensAt},
      "selfCheckInClosesAt" = ${checkinClosesAt}
    WHERE id = ${lc.id}`;

    const reminderChannels = [
      "EMAIL",
      ...(process.env.AT_API_KEY ? ["SMS"] : []),
      ...(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_CLASS_REMINDER_TEMPLATE ? ["WHATSAPP"] : []),
    ];
    for (const minutes of [1440, 30]) {
      const remindAt = new Date(at.getTime() - minutes * 60_000);
      if (remindAt <= new Date()) continue;
      for (const channel of reminderChannels) {
        const id = randomUUID();
        await db.$executeRaw`INSERT INTO live_class_reminders (id, "liveClassId", channel, "remindAt")
          VALUES (${id}, ${lc.id}, ${channel}, ${remindAt})
          ON CONFLICT ("liveClassId", channel, "remindAt") DO NOTHING`;
      }
    }
    return lc;
  }

  const firstClass = await createOne(startAt);

  // Weekly repeat
  const created = [firstClass];
  if (repeatWeeklyUntil) {
    const until = new Date(repeatWeeklyUntil);
    let next = new Date(startAt.getTime() + 7 * 24 * 60 * 60_000);
    while (next <= until) {
      const weekConflicts = await detectConflicts(session.user.id, next, durationMin, venue);
      if (weekConflicts.length === 0) {
        created.push(await createOne(new Date(next)));
      }
      next = new Date(next.getTime() + 7 * 24 * 60 * 60_000);
    }
  }

  return NextResponse.json({ created, count: created.length }, { status: 201 });
}

// ─── PATCH: class actions ─────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    requirePermission(session.user.role, "classes.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    throw error;
  }

  const body = await req.json().catch(() => null);
  const parsed = ClassActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid class action", details: parsed.error.flatten() }, { status: 400 });

  const liveClass = await db.liveClass.findFirst({
    where: { id: parsed.data.classId, course: teachingCourseWhere(session.user.id) },
    include: { course: { select: { title: true } } },
  });
  if (!liveClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  // ── edit ──────────────────────────────────────────────────────────────────
  if (parsed.data.action === "edit") {
    if (liveClass.status === "COMPLETED" || liveClass.status === "CANCELLED")
      return NextResponse.json({ error: "Cannot edit a completed or cancelled class." }, { status: 409 });
    const { title, description, joinUrl, venue, durationMin } = parsed.data;
    const updated = await db.liveClass.update({
      where: { id: liveClass.id },
      data: {
        ...(title != null && { title }),
        ...(description != null && { description }),
        ...(joinUrl != null && { joinUrl }),
        ...(venue != null && { venue }),
        ...(durationMin != null && { durationMin }),
      },
    });
    return NextResponse.json({ ok: true, class: updated });
  }

  // ── reschedule ────────────────────────────────────────────────────────────
  if (parsed.data.action === "reschedule") {
    if (liveClass.status === "COMPLETED" || liveClass.status === "CANCELLED" || liveClass.status === "LIVE")
      return NextResponse.json({ error: "Cannot reschedule a completed, cancelled, or live class." }, { status: 409 });

    const newAt = new Date(parsed.data.newScheduledAt);
    if (newAt <= new Date())
      return NextResponse.json({ error: "New date must be in the future." }, { status: 400 });

    // Conflict detection (exclude current class)
    const conflicts = await detectConflicts(session.user.id, newAt, liveClass.durationMin, liveClass.venue, liveClass.id);
    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: `Conflict: "${conflicts[0].title}" is already scheduled at overlapping time.`,
          conflicts: conflicts.map((c) => ({ id: c.id, title: c.title, scheduledAt: c.scheduledAt })),
        },
        { status: 409 },
      );
    }

    const originalScheduledAt = liveClass.originalScheduledAt ?? liveClass.scheduledAt;

    const updated = await db.liveClass.update({
      where: { id: liveClass.id },
      data: {
        scheduledAt: newAt,
        status: "RESCHEDULED",
        rescheduleReason: parsed.data.reason,
        originalScheduledAt,
      },
    });

    // Notify enrolled students
    await notifyEnrolledStudents(liveClass.courseId, liveClass.id, session.user.id, {
      type: "CLASS_RESCHEDULED",
      subject: `Class rescheduled: ${liveClass.title}`,
      body: `Your class "${liveClass.title}" (${liveClass.course.title}) has been rescheduled to ${newAt.toLocaleString("en-UG", { timeZone: "Africa/Kampala" })} EAT. Reason: ${parsed.data.reason}`,
    });

    return NextResponse.json({ ok: true, class: updated });
  }

  // ── cancel ────────────────────────────────────────────────────────────────
  if (parsed.data.action === "cancel") {
    if (liveClass.status === "COMPLETED" || liveClass.status === "CANCELLED")
      return NextResponse.json({ error: "Class is already completed or cancelled." }, { status: 409 });

    const updated = await db.liveClass.update({
      where: { id: liveClass.id },
      data: {
        status: "CANCELLED",
        cancelReason: parsed.data.reason,
      },
    });

    // Notify enrolled students
    await notifyEnrolledStudents(liveClass.courseId, liveClass.id, session.user.id, {
      type: "CLASS_CANCELLED",
      subject: `Class cancelled: ${liveClass.title}`,
      body: `Your class "${liveClass.title}" (${liveClass.course.title}) scheduled for ${liveClass.scheduledAt.toLocaleString("en-UG", { timeZone: "Africa/Kampala" })} EAT has been cancelled. Reason: ${parsed.data.reason}`,
    });

    return NextResponse.json({ ok: true, class: updated });
  }

  // ── students_may_speak ────────────────────────────────────────────────────
  if (parsed.data.action === "students_may_speak") {
    await db.$executeRaw`UPDATE live_classes SET "studentsMaySpeak" = ${parsed.data.studentsMaySpeak} WHERE id = ${liveClass.id}`;
    return NextResponse.json({
      studentsMaySpeak: parsed.data.studentsMaySpeak,
      providerSupport:
        liveClass.platform === "bbb"
          ? "BigBlueButton room controls apply after the instructor opens the room."
          : "The external meeting provider controls microphone permissions.",
    });
  }

  // ── recording ─────────────────────────────────────────────────────────────
  if (parsed.data.action === "recording") {
    if (liveClass.status !== "COMPLETED")
      return NextResponse.json({ error: "Add the replay link after the class has ended." }, { status: 400 });
    await db.liveClass.update({ where: { id: liveClass.id }, data: { recordingUrl: parsed.data.recordingUrl } });
    await db.$executeRaw`UPDATE live_classes SET "recordingStatus" = 'AVAILABLE' WHERE id = ${liveClass.id}`;
    await (
      await import("@/lib/audit")
    ).audit({
      actorId: session.user.id,
      action: "UPDATE",
      entityType: "LiveClassRecording",
      entityId: liveClass.id,
      metadata: { provider: liveClass.platform },
    });
    return NextResponse.json({ recordingStatus: "AVAILABLE" });
  }

  // ── start / stop ──────────────────────────────────────────────────────────
  if (parsed.data.action === "start" && liveClass.status !== "SCHEDULED" && liveClass.status !== "RESCHEDULED")
    return NextResponse.json({ error: "Only scheduled classes can be started." }, { status: 409 });
  if (parsed.data.action === "stop" && liveClass.status !== "LIVE")
    return NextResponse.json({ error: "Only live classes can be stopped." }, { status: 409 });

  if (parsed.data.action === "start") {
    const started = await import("@/lib/live/provider").then(({ startProviderMeeting }) =>
      startProviderMeeting({
        classId: liveClass.id,
        title: liveClass.title,
        moderatorName: session.user.name ?? "Instructor",
        recording: true,
        provider:
          liveClass.platform === "bbb" ? "bbb" : liveClass.platform === "jitsi" ? "jitsi" : "link",
      }),
    );
    await db.$executeRaw`UPDATE live_classes SET
      "providerMeetingId" = ${started.meetingId},
      "joinUrl" = CASE WHEN ${started.moderatorUrl}::text IS NULL THEN "joinUrl" ELSE ${started.moderatorUrl} END
    WHERE id = ${liveClass.id}`;
  } else {
    await (
      await import("@/lib/live/provider")
    ).endProviderMeeting({
      classId: liveClass.id,
      provider: liveClass.platform === "bbb" ? "bbb" : liveClass.platform === "jitsi" ? "jitsi" : "link",
    });
  }

  const status = parsed.data.action === "start" ? "LIVE" : "COMPLETED";
  const updated = await db.liveClass.update({ where: { id: liveClass.id }, data: { status } });
  if (status === "COMPLETED")
    await db.$executeRaw`UPDATE live_classes SET "recordingStatus" = CASE WHEN "recordingUrl" IS NULL THEN 'PENDING' ELSE 'AVAILABLE' END WHERE id = ${liveClass.id}`;
  if (status === "COMPLETED" && liveClass.platform !== "bbb" && !liveClass.recordingUrl) {
    const tutor = await db.user.findUnique({ where: { id: liveClass.tutorId }, select: { name: true, email: true } });
    if (tutor)
      await (await import("@/lib/live/reminders")).remindInstructorToAddReplay({
        email: tutor.email,
        name: tutor.name,
        title: liveClass.title,
      }).catch(() => undefined);
  }

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    provider: liveClass.platform,
    joinUrl: updated.joinUrl,
    recordingPending: status === "COMPLETED" && liveClass.platform !== "bbb" && !liveClass.recordingUrl,
    externalRoomMustBeEnded: status === "COMPLETED" && liveClass.platform === "link",
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create in-app + email (demo) notifications for all students enrolled in this course. */
async function notifyEnrolledStudents(
  courseId: string,
  classId: string,
  fromUserId: string,
  notification: { type: string; subject: string; body: string },
) {
  try {
    const enrolments = await db.enrolment.findMany({
      where: {
        courseId,
        status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] },
        user: { role: "STUDENT" },
      },
      select: { userId: true, user: { select: { email: true, name: true } } },
    });

    for (const enr of enrolments) {
      await db.notification.create({
        data: {
          userId: enr.userId,
          channel: "IN_APP",
          type: notification.type as "NEW_MESSAGE",
          subject: notification.subject,
          body: notification.body,
          metadata: { classId, fromUserId },
        },
      });

      // Demo email (throttled to prevent spamming in dev)
      if (enr.user.email) {
        const { sendEmail } = await import("@/lib/email");
        await sendEmail({
          to: enr.user.email,
          subject: notification.subject,
          template: "plain",
          variables: {
            name: enr.user.name ?? "Student",
            body: notification.body,
          },
        }).catch(() => undefined);
      }
    }
  } catch (err) {
    console.error("[timetable] notification error:", err);
  }
}

/** Generate ICS calendar file for the instructor's upcoming and recent classes. */
async function handleICSExport(userId: string, name: string) {
  const classes = await db.liveClass.findMany({
    where: {
      course: teachingCourseWhere(userId),
      status: { in: ["SCHEDULED", "LIVE", "RESCHEDULED"] },
      scheduledAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60_000) },
    },
    orderBy: { scheduledAt: "asc" },
    include: { course: { select: { title: true } } },
  });

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Musawo Training Center//Timetable//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${name} Timetable - Musawo TC`,
    "X-WR-TIMEZONE:Africa/Kampala",
  ];

  for (const cls of classes) {
    const start = cls.scheduledAt;
    const end = new Date(start.getTime() + cls.durationMin * 60_000);
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${cls.id}@musawo.ug`);
    lines.push(`DTSTART:${toICSDate(start)}`);
    lines.push(`DTEND:${toICSDate(end)}`);
    lines.push(`SUMMARY:${icsEscape(cls.title)}`);
    lines.push(`DESCRIPTION:${icsEscape(cls.course.title + (cls.joinUrl ? " | " + cls.joinUrl : ""))}`);
    if (cls.joinUrl) lines.push(`URL:${cls.joinUrl}`);
    if (cls.venue) lines.push(`LOCATION:${icsEscape(cls.venue)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="timetable-musawo.ics"`,
    },
  });
}

function toICSDate(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")
    .slice(0, 15) + "Z";
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
