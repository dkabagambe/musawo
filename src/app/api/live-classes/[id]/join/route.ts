import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessLevel } from "@/lib/enrolment/access";
import { getProviderJoinUrl } from "@/lib/live/provider";
import { can } from "@/lib/rbac";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const liveClass = await db.liveClass.findUnique({ where: { id: params.id } });
  if (!liveClass || liveClass.status !== "LIVE") return NextResponse.json({ error: "Class is not live" }, { status: 409 });
  const [enrolment, rows] = await Promise.all([
    db.enrolment.findUnique({ where: { userId_courseId: { userId: session.user.id, courseId: liveClass.courseId } } }),
    db.$queryRaw<Array<{ admissionRequestedAt: Date | null; admittedAt: Date | null }>>`SELECT "admissionRequestedAt", "admittedAt" FROM attendance WHERE "liveClassId" = ${liveClass.id} AND "userId" = ${session.user.id}`,
  ]);
  if (!enrolment || !["ACTIVE", "PARTIALLY_PAID", "COMPLETED"].includes(enrolment.status) || getAccessLevel(enrolment) === "NONE" || !can(session.user.role, "classes.join")) return NextResponse.json({ error: "A paid student enrolment is required" }, { status: 403 });
  const attendance = rows[0];
  const joinUrl = attendance?.admittedAt
    ? liveClass.platform === "bbb"
      ? await getProviderJoinUrl({ classId: liveClass.id, userId: session.user.id, name: session.user.name ?? "Student", role: "VIEWER", provider: "bbb" })
      : liveClass.joinUrl
    : null;
  return NextResponse.json({
    state: attendance?.admittedAt ? "admitted" : attendance?.admissionRequestedAt ? "waiting" : "not_requested",
    ...(joinUrl ? { joinUrl } : {}),
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const liveClass = await db.liveClass.findUnique({ where: { id: params.id } });
  if (!liveClass || liveClass.status !== "LIVE") return NextResponse.json({ error: "Class is not live" }, { status: 409 });
  if (!can(session.user.role, "classes.join")) return NextResponse.json({ error: "Student account required" }, { status: 403 });
  const enrolment = await db.enrolment.findUnique({ where: { userId_courseId: { userId: session.user.id, courseId: liveClass.courseId } } });
  if (!enrolment || !["ACTIVE", "PARTIALLY_PAID", "COMPLETED"].includes(enrolment.status) || getAccessLevel(enrolment) === "NONE") {
    return NextResponse.json({ error: "Verified course payment is required to request entry" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({})) as { action?: string };
  const attendance = await db.$queryRaw<Array<{ admittedAt: Date | null }>>`SELECT "admittedAt" FROM attendance WHERE "liveClassId" = ${liveClass.id} AND "userId" = ${session.user.id}`;
  if (body.action === "raise_hand" || body.action === "self_checkin") {
    if (!attendance[0]?.admittedAt) return NextResponse.json({ error: "Wait until your instructor admits you." }, { status: 403 });
    if (body.action === "raise_hand") await db.$executeRaw`UPDATE attendance SET "handRaisedAt" = NOW() WHERE "liveClassId" = ${liveClass.id} AND "userId" = ${session.user.id}`;
    else {
      const checkin = await db.$queryRaw<Array<{ opens: Date | null; closes: Date | null }>>`SELECT "selfCheckInOpensAt" AS opens, "selfCheckInClosesAt" AS closes FROM live_classes WHERE id = ${liveClass.id}`;
      const window = checkin[0]; const now = new Date();
      if (!window?.opens || !window.closes || now < window.opens || now > window.closes) return NextResponse.json({ error: "The self check-in window is closed." }, { status: 409 });
      await db.$executeRaw`UPDATE attendance SET "selfCheckedInAt" = COALESCE("selfCheckedInAt", NOW()), "startMark" = COALESCE("startMark", 'PRESENT'::"AttendanceMark") WHERE "liveClassId" = ${liveClass.id} AND "userId" = ${session.user.id}`;
    }
    return NextResponse.json({ ok: true });
  }
  await db.attendance.upsert({
    where: { liveClassId_userId: { liveClassId: liveClass.id, userId: session.user.id } },
    create: { liveClassId: liveClass.id, userId: session.user.id },
    update: {},
  });
  await db.$executeRaw`UPDATE attendance SET "admissionRequestedAt" = COALESCE("admissionRequestedAt", NOW()) WHERE "liveClassId" = ${liveClass.id} AND "userId" = ${session.user.id}`;
  return NextResponse.json({ state: "waiting" }, { status: 202 });
}
