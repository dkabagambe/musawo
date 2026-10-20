import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, ForbiddenError, requirePermission } from "@/lib/rbac";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { audit } from "@/lib/audit";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "attendance.view") && !can(session.user.role, "attendance.take")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const classId = new URL(req.url).searchParams.get("classId");
  if (!classId) return NextResponse.json({ error: "classId is required" }, { status: 400 });
  const liveClass = await db.liveClass.findFirst({
    where: { id: classId, course: teachingCourseWhere(session.user.id) },
    include: { course: { select: { id: true, title: true } } },
  });
  if (!liveClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const [students, attendance] = await Promise.all([
    db.enrolment.findMany({
      where: { courseId: liveClass.courseId, user: { role: "STUDENT" }, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] } },
      select: { user: { select: { id: true, name: true, studentNumber: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    db.attendance.findMany({ where: { liveClassId: classId } }),
  ]);
  const waiting = await db.$queryRaw<Array<{ userId: string; name: string; studentNumber: string | null; admissionRequestedAt: Date; handRaisedAt: Date | null }>>`
    SELECT u.id AS "userId", u.name, u."studentNumber", a."admissionRequestedAt", a."handRaisedAt"
    FROM attendance a JOIN users u ON u.id = a."userId"
    WHERE a."liveClassId" = ${classId} AND a."admissionRequestedAt" IS NOT NULL AND a."admittedAt" IS NULL
    ORDER BY a."admissionRequestedAt" ASC
  `;
  const raisedHands = await db.$queryRaw<Array<{ userId: string; name: string; studentNumber: string | null; handRaisedAt: Date }>>`
    SELECT u.id AS "userId", u.name, u."studentNumber", a."handRaisedAt"
    FROM attendance a JOIN users u ON u.id = a."userId"
    WHERE a."liveClassId" = ${classId} AND a."handRaisedAt" IS NOT NULL AND a."admittedAt" IS NOT NULL
    ORDER BY a."handRaisedAt" ASC
  `;
  const marks = await db.$queryRaw<Array<{ userId: string; startMark: string | null; endMark: string | null; startComment: string | null; endComment: string | null; joinedAt: Date | null; leftAt: Date | null; canSpeak: boolean; isMuted: boolean; isPresenter: boolean }>>`SELECT "userId", "startMark"::text, "endMark"::text, "startComment", "endComment", "joinedAt", "leftAt", "canSpeak", "isMuted", "isPresenter" FROM attendance WHERE "liveClassId" = ${classId}`;
  return NextResponse.json({
    liveClass: { id: liveClass.id, title: liveClass.title, course: liveClass.course.title },
    students: students.map(({ user }) => ({ ...user, present: attendance.find((a) => a.userId === user.id)?.markedPresent ?? false })),
    marks: marks.map((mark) => ({ ...mark, joinedAt: mark.joinedAt?.toISOString() ?? null, leftAt: mark.leftAt?.toISOString() ?? null })),
    waiting: waiting.map((request) => ({ ...request, admissionRequestedAt: request.admissionRequestedAt.toISOString(), handRaisedAt: request.handRaisedAt?.toISOString() ?? null })),
    raisedHands: raisedHands.map((request) => ({ ...request, handRaisedAt: request.handRaisedAt.toISOString() })),
  });
}

const MarkSchema = z.object({ classId: z.string().cuid(), marks: z.array(z.object({ studentId: z.string().cuid(), present: z.boolean() })).min(1).max(500) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = await req.json();
  if (raw && typeof raw === "object" && (raw as { action?: string }).action === "admit_all") {
    try { requirePermission(session.user.role, "classes.manage"); }
    catch (error) { if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 }); throw error; }
    const parsedAll = z.object({ action: z.literal("admit_all"), classId: z.string().cuid() }).safeParse(raw);
    if (!parsedAll.success) return NextResponse.json({ error: "Invalid admission request" }, { status: 400 });
    const liveClass = await db.liveClass.findFirst({ where: { id: parsedAll.data.classId, status: "LIVE", course: teachingCourseWhere(session.user.id) }, select: { id: true, courseId: true } });
    if (!liveClass) return NextResponse.json({ error: "Live class not found" }, { status: 404 });
    const enrolled = await db.enrolment.findMany({ where: { courseId: liveClass.courseId, user: { role: "STUDENT" }, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] } }, select: { userId: true } });
    await db.$transaction(enrolled.map(({ userId }) => db.attendance.upsert({ where: { liveClassId_userId: { liveClassId: liveClass.id, userId } }, create: { liveClassId: liveClass.id, userId }, update: {} })));
    if (enrolled.length) await db.$executeRaw`UPDATE attendance SET "admissionRequestedAt" = COALESCE("admissionRequestedAt", NOW()), "admittedAt" = NOW() WHERE "liveClassId" = ${liveClass.id} AND "userId" IN (${(await import("@prisma/client")).Prisma.join(enrolled.map(({ userId }) => userId))})`;
    await audit({ actorId: session.user.id, action: "UPDATE", entityType: "LiveClassAdmission", entityId: liveClass.id, metadata: { admittedAll: enrolled.length } });
    return NextResponse.json({ admitted: enrolled.length });
  }
  if (raw && typeof raw === "object" && (raw as { action?: string }).action === "controls") {
    try { requirePermission(session.user.role, "classes.manage"); }
    catch (error) { if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 }); throw error; }
    const controls = z.object({ action: z.literal("controls"), classId: z.string().cuid(), studentId: z.string().cuid(), canSpeak: z.boolean().optional(), isMuted: z.boolean().optional(), isPresenter: z.boolean().optional() }).safeParse(raw);
    if (!controls.success) return NextResponse.json({ error: "Invalid interaction control" }, { status: 400 });
    const liveClass = await db.liveClass.findFirst({ where: { id: controls.data.classId, status: "LIVE", course: teachingCourseWhere(session.user.id) }, select: { id: true, platform: true } });
    if (!liveClass) return NextResponse.json({ error: "Live class not found" }, { status: 404 });
    await db.$executeRaw`UPDATE attendance SET "canSpeak" = COALESCE(${controls.data.canSpeak ?? null}, "canSpeak"), "isMuted" = COALESCE(${controls.data.isMuted ?? null}, "isMuted"), "isPresenter" = COALESCE(${controls.data.isPresenter ?? null}, "isPresenter") WHERE "liveClassId" = ${liveClass.id} AND "userId" = ${controls.data.studentId}`;
    await audit({ actorId: session.user.id, action: "UPDATE", entityType: "LiveClassInteraction", entityId: liveClass.id, metadata: { studentId: controls.data.studentId, canSpeak: controls.data.canSpeak, isMuted: controls.data.isMuted, isPresenter: controls.data.isPresenter, provider: liveClass.platform } });
    return NextResponse.json({ ok: true, providerSupport: liveClass.platform === "bbb" ? "Use the BigBlueButton participant controls in the room for microphone and presenter changes." : "This external provider does not expose participant controls to Musawo. Apply this setting in the meeting room." });
  }
  if (raw && typeof raw === "object" && (raw as { action?: string }).action === "controls_all") {
    try { requirePermission(session.user.role, "classes.manage"); }
    catch (error) { if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 }); throw error; }
    const controls = z.object({ action: z.literal("controls_all"), classId: z.string().cuid(), canSpeak: z.boolean(), isMuted: z.boolean() }).safeParse(raw);
    if (!controls.success) return NextResponse.json({ error: "Invalid microphone settings" }, { status: 400 });
    const liveClass = await db.liveClass.findFirst({ where: { id: controls.data.classId, status: "LIVE", course: teachingCourseWhere(session.user.id) }, select: { id: true, platform: true } });
    if (!liveClass) return NextResponse.json({ error: "Live class not found" }, { status: 404 });
    await db.$executeRaw`UPDATE attendance SET "canSpeak" = ${controls.data.canSpeak}, "isMuted" = ${controls.data.isMuted} WHERE "liveClassId" = ${liveClass.id}`;
    await audit({ actorId: session.user.id, action: "UPDATE", entityType: "LiveClassInteraction", entityId: liveClass.id, metadata: { allStudents: true, canSpeak: controls.data.canSpeak, isMuted: controls.data.isMuted, provider: liveClass.platform } });
    return NextResponse.json({ ok: true, providerSupport: liveClass.platform === "bbb" ? "Apply the matching mute-all or unmute-all action in the BigBlueButton participant controls." : "Apply the matching mute-all or unmute-all action in the external meeting provider." });
  }
  if (raw && typeof raw === "object" && (raw as { action?: string }).action === "rollcall") {
    try { requirePermission(session.user.role, "attendance.take"); }
    catch (error) { if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 }); throw error; }
    const rollCall = z.object({ action: z.literal("rollcall"), classId: z.string().cuid(), point: z.enum(["start", "end"]), marks: z.array(z.object({ studentId: z.string().cuid(), status: z.enum(["PRESENT", "LATE", "ABSENT", "EXCUSED"]), comment: z.string().max(1000).optional() })).min(1).max(500) }).safeParse(raw);
    if (!rollCall.success) return NextResponse.json({ error: "Invalid roll call" }, { status: 400 });
    const liveClass = await db.liveClass.findFirst({ where: { id: rollCall.data.classId, course: teachingCourseWhere(session.user.id) }, select: { id: true, courseId: true } });
    if (!liveClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });
    const eligible = await db.enrolment.findMany({ where: { courseId: liveClass.courseId, userId: { in: rollCall.data.marks.map((mark) => mark.studentId) }, user: { role: "STUDENT" }, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] } }, select: { userId: true } });
    const eligibleIds = new Set(eligible.map((row) => row.userId));
    if (rollCall.data.marks.some((mark) => !eligibleIds.has(mark.studentId))) return NextResponse.json({ error: "Roll call can only include enrolled students." }, { status: 400 });
    await db.$transaction(rollCall.data.marks.map((mark) => rollCall.data.point === "start"
      ? db.$executeRaw`INSERT INTO attendance (id, "liveClassId", "userId", "startMark", "startComment", "markedPresent", "createdAt") VALUES (concat('att_', md5(random()::text || clock_timestamp()::text)), ${liveClass.id}, ${mark.studentId}, ${mark.status}::"AttendanceMark", ${mark.comment ?? null}, ${mark.status} IN ('PRESENT','LATE'), NOW()) ON CONFLICT ("liveClassId", "userId") DO UPDATE SET "startMark" = ${mark.status}::"AttendanceMark", "startComment" = ${mark.comment ?? null}, "markedPresent" = ${mark.status} IN ('PRESENT','LATE')`
      : db.$executeRaw`INSERT INTO attendance (id, "liveClassId", "userId", "endMark", "endComment", "markedPresent", "createdAt") VALUES (concat('att_', md5(random()::text || clock_timestamp()::text)), ${liveClass.id}, ${mark.studentId}, ${mark.status}::"AttendanceMark", ${mark.comment ?? null}, ${mark.status} IN ('PRESENT','LATE'), NOW()) ON CONFLICT ("liveClassId", "userId") DO UPDATE SET "endMark" = ${mark.status}::"AttendanceMark", "endComment" = ${mark.comment ?? null}, "markedPresent" = ${mark.status} IN ('PRESENT','LATE')`));
    await audit({ actorId: session.user.id, action: "UPDATE", entityType: "Attendance", entityId: liveClass.id, metadata: { point: rollCall.data.point, marks: rollCall.data.marks } });
    return NextResponse.json({ saved: rollCall.data.marks.length });
  }
  if (raw && typeof raw === "object" && (raw as { action?: string }).action === "admit") {
    try { requirePermission(session.user.role, "classes.manage"); }
    catch (error) { if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 }); throw error; }
    const admission = z.object({ action: z.literal("admit"), classId: z.string().cuid(), studentIds: z.array(z.string().cuid()).min(1).max(500) }).safeParse(raw);
    if (!admission.success) return NextResponse.json({ error: "Invalid admission request" }, { status: 400 });
    const liveClass = await db.liveClass.findFirst({ where: { id: admission.data.classId, status: "LIVE", course: teachingCourseWhere(session.user.id) }, select: { id: true } });
    if (!liveClass) return NextResponse.json({ error: "Live class not found" }, { status: 404 });
    const admitted = await db.$executeRaw`
      UPDATE attendance SET "admittedAt" = NOW()
      WHERE "liveClassId" = ${liveClass.id} AND "userId" IN (${(await import("@prisma/client")).Prisma.join(admission.data.studentIds)}) AND "admissionRequestedAt" IS NOT NULL
    `;
    await audit({ actorId: session.user.id, action: "UPDATE", entityType: "LiveClassAdmission", entityId: liveClass.id, metadata: { studentIds: admission.data.studentIds } });
    return NextResponse.json({ admitted });
  }
  try { requirePermission(session.user.role, "attendance.take"); }
  catch (error) { if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 }); throw error; }
  const parsed = MarkSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid attendance data" }, { status: 400 });

  const liveClass = await db.liveClass.findFirst({
    where: { id: parsed.data.classId, course: teachingCourseWhere(session.user.id) },
    select: { id: true, courseId: true },
  });
  if (!liveClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  const eligible = await db.enrolment.findMany({
    where: { courseId: liveClass.courseId, userId: { in: parsed.data.marks.map((m) => m.studentId) }, user: { role: "STUDENT" }, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] } },
    select: { userId: true },
  });
  const eligibleIds = new Set(eligible.map((row) => row.userId));
  if (parsed.data.marks.some((mark) => !eligibleIds.has(mark.studentId))) return NextResponse.json({ error: "One or more students are not enrolled in this course." }, { status: 400 });

  await db.$transaction(parsed.data.marks.map((mark) => db.attendance.upsert({
    where: { liveClassId_userId: { liveClassId: liveClass.id, userId: mark.studentId } },
    create: { liveClassId: liveClass.id, userId: mark.studentId, markedPresent: mark.present, joinedAt: mark.present ? new Date() : null },
    update: { markedPresent: mark.present },
  })));
  await audit({ actorId: session.user.id, action: "UPDATE", entityType: "Attendance", entityId: liveClass.id, metadata: { count: parsed.data.marks.length } });
  return NextResponse.json({ saved: parsed.data.marks.length });
}
