import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { z } from "zod";
import { canAccessTeachingCourse, teachingCourseWhere } from "@/lib/teaching/scope";
import { can } from "@/lib/rbac";
import { randomUUID } from "crypto";

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
});

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "classes.view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const classes = await db.liveClass.findMany({
    where: { course: teachingCourseWhere(session.user.id) },
    orderBy: { scheduledAt: "desc" },
    include: { course: { select: { title: true } } },
  });
  const settings = classes.length ? await db.$queryRaw<Array<{ id: string; studentsMaySpeak: boolean; recordingStatus: string; recordingEnabled: boolean }>>`SELECT id, "studentsMaySpeak", "recordingStatus", "recordingEnabled" FROM live_classes WHERE id IN (${(await import("@prisma/client")).Prisma.join(classes.map((item) => item.id))})` : [];
  const byId = new Map(settings.map((item) => [item.id, item]));
  return NextResponse.json({ classes: classes.map((item) => ({ ...item, ...(byId.get(item.id) ?? {}) })) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "classes.manage"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: (e as Error).message }, { status: 403 }); throw e; }

  const parsed = CreateClassSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { courseId, blockId, title, description, scheduledAt, durationMin, selfCheckIn } = parsed.data;
  const platform = parsed.data.platform === "google_meet" || parsed.data.platform === "zoom" ? "link" : parsed.data.platform;
  const joinUrl = parsed.data.joinUrl;
  if (platform === "link" && !joinUrl) return NextResponse.json({ error: "A meeting link is required for this provider." }, { status: 400 });
  if (platform === "bbb" && (!process.env.BBB_URL || !process.env.BBB_SECRET)) return NextResponse.json({ error: "BigBlueButton is not configured. Use a meeting link or ask IT to configure it." }, { status: 503 });
  if (platform === "jitsi" && process.env.JITSI_ENABLED !== "true") return NextResponse.json({ error: "Jitsi is disabled. Use a meeting link or ask IT to enable it." }, { status: 503 });

  if (!await canAccessTeachingCourse(courseId, session.user.id)) {
    return NextResponse.json({ error: "You are not assigned to this course." }, { status: 403 });
  }
  if (blockId) {
    const block = await db.block.findFirst({ where: { id: blockId, courseId }, select: { id: true } });
    if (!block) return NextResponse.json({ error: "The selected unit does not belong to this course." }, { status: 400 });
  }

  const liveClass = await db.liveClass.create({
    data: {
      courseId,
      blockId: blockId ?? null,
      tutorId: session.user.id,
      title,
      description: description ?? null,
      scheduledAt: new Date(scheduledAt),
      durationMin,
      joinUrl: joinUrl ?? "",
      platform,
      status: "SCHEDULED",
    },
    include: { course: { select: { title: true } } },
  });
  const checkinOpensAt = selfCheckIn ? new Date(new Date(scheduledAt).getTime() - 15 * 60_000) : null;
  const checkinClosesAt = selfCheckIn ? new Date(new Date(scheduledAt).getTime() + 30 * 60_000) : null;
  await db.$executeRaw`UPDATE live_classes SET "recordingEnabled" = true, "minimumAttendancePercent" = (SELECT "minimumAttendancePercent" FROM courses WHERE id = ${courseId}), "selfCheckInOpensAt" = ${checkinOpensAt}, "selfCheckInClosesAt" = ${checkinClosesAt} WHERE id = ${liveClass.id}`;

  const reminderChannels = ["EMAIL", ...(process.env.AT_API_KEY ? ["SMS"] : []), ...(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_CLASS_REMINDER_TEMPLATE ? ["WHATSAPP"] : [])];
  const reminderRows: Array<{ id: string; channel: string; remindAt: Date }> = [];
  for (const minutes of [1440, 30]) {
    const remindAt = new Date(new Date(scheduledAt).getTime() - minutes * 60_000);
    if (remindAt <= new Date()) continue;
    for (const channel of reminderChannels) reminderRows.push({ id: randomUUID(), channel, remindAt });
  }
  if (reminderRows.length) await db.$transaction(reminderRows.map((reminder) => db.$executeRaw`INSERT INTO live_class_reminders (id, "liveClassId", channel, "remindAt") VALUES (${reminder.id}, ${liveClass.id}, ${reminder.channel}, ${reminder.remindAt}) ON CONFLICT ("liveClassId", channel, "remindAt") DO NOTHING`));

  return NextResponse.json(liveClass, { status: 201 });
}

const ClassActionSchema = z.object({ classId: z.string().cuid(), action: z.enum(["start", "stop", "students_may_speak", "recording"]), studentsMaySpeak: z.boolean().optional(), recordingUrl: z.string().url().refine((value) => value.startsWith("https://"), "Use an HTTPS replay link.").optional() });

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "classes.manage"); }
  catch (error) { if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 }); throw error; }
  const parsed = ClassActionSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid class action" }, { status: 400 });
  const liveClass = await db.liveClass.findFirst({ where: { id: parsed.data.classId, course: teachingCourseWhere(session.user.id) } });
  if (!liveClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  if (parsed.data.action === "students_may_speak") {
    if (typeof parsed.data.studentsMaySpeak !== "boolean") return NextResponse.json({ error: "Set the speaking permission." }, { status: 400 });
    await db.$executeRaw`UPDATE live_classes SET "studentsMaySpeak" = ${parsed.data.studentsMaySpeak} WHERE id = ${liveClass.id}`;
    return NextResponse.json({ studentsMaySpeak: parsed.data.studentsMaySpeak, providerSupport: liveClass.platform === "bbb" ? "BigBlueButton room controls apply after the instructor opens the room." : "The external meeting provider controls microphone permissions." });
  }
  if (parsed.data.action === "recording") {
    if (liveClass.status !== "COMPLETED" || !parsed.data.recordingUrl) return NextResponse.json({ error: "Add the replay link after the class has ended." }, { status: 400 });
    await db.liveClass.update({ where: { id: liveClass.id }, data: { recordingUrl: parsed.data.recordingUrl } });
    await db.$executeRaw`UPDATE live_classes SET "recordingStatus" = 'AVAILABLE' WHERE id = ${liveClass.id}`;
    await (await import("@/lib/audit")).audit({ actorId: session.user.id, action: "UPDATE", entityType: "LiveClassRecording", entityId: liveClass.id, metadata: { provider: liveClass.platform } });
    return NextResponse.json({ recordingStatus: "AVAILABLE" });
  }
  if (parsed.data.action === "start" && liveClass.status !== "SCHEDULED") return NextResponse.json({ error: "Only scheduled classes can be started." }, { status: 409 });
  if (parsed.data.action === "stop" && liveClass.status !== "LIVE") return NextResponse.json({ error: "Only live classes can be stopped." }, { status: 409 });
  if (parsed.data.action === "start") {
    const started = await import("@/lib/live/provider").then(({ startProviderMeeting }) => startProviderMeeting({
      classId: liveClass.id,
      title: liveClass.title,
      moderatorName: session.user.name ?? "Instructor",
      recording: true,
      provider: liveClass.platform === "bbb" ? "bbb" : liveClass.platform === "jitsi" ? "jitsi" : "link",
    }));
    await db.$executeRaw`UPDATE live_classes SET "providerMeetingId" = ${started.meetingId}, "joinUrl" = CASE WHEN ${started.moderatorUrl}::text IS NULL THEN "joinUrl" ELSE ${started.moderatorUrl} END WHERE id = ${liveClass.id}`;
  } else {
    await (await import("@/lib/live/provider")).endProviderMeeting({ classId: liveClass.id, provider: liveClass.platform === "bbb" ? "bbb" : liveClass.platform === "jitsi" ? "jitsi" : "link" });
  }
  const status = parsed.data.action === "start" ? "LIVE" : "COMPLETED";
  const updated = await db.liveClass.update({ where: { id: liveClass.id }, data: { status } });
  if (status === "COMPLETED") await db.$executeRaw`UPDATE live_classes SET "recordingStatus" = CASE WHEN "recordingUrl" IS NULL THEN 'PENDING' ELSE 'AVAILABLE' END WHERE id = ${liveClass.id}`;
  if (status === "COMPLETED" && liveClass.platform !== "bbb" && !liveClass.recordingUrl) {
    const tutor = await db.user.findUnique({ where: { id: liveClass.tutorId }, select: { name: true, email: true } });
    if (tutor) await (await import("@/lib/live/reminders")).remindInstructorToAddReplay({ email: tutor.email, name: tutor.name, title: liveClass.title }).catch(() => undefined);
  }
  return NextResponse.json({ id: updated.id, status: updated.status, provider: liveClass.platform, joinUrl: updated.joinUrl, recordingPending: status === "COMPLETED" && liveClass.platform !== "bbb" && !liveClass.recordingUrl, externalRoomMustBeEnded: status === "COMPLETED" && liveClass.platform === "link" });
}
