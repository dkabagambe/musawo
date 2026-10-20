import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";
import { redis } from "@/lib/db/redis";
import { getAccessLevel } from "@/lib/enrolment/access";

const Schema = z.object({ classId: z.string().cuid().nullable().optional(), leave: z.boolean().optional() });
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid heartbeat" }, { status: 400 });
  const classId = parsed.data.classId ?? null;
  const hasClassId = Object.prototype.hasOwnProperty.call(parsed.data, "classId");
  const leave = parsed.data.leave ?? false;
  if (classId) {
    const liveClass = await db.liveClass.findFirst({ where: { id: classId, status: "LIVE" }, select: { id: true, courseId: true } });
    if (!liveClass) return NextResponse.json({ error: "Class is not live" }, { status: 409 });
    if (can(session.user.role, "classes.join")) {
      const access = await db.enrolment.findUnique({ where: { userId_courseId: { userId: session.user.id, courseId: liveClass.courseId } } });
      const admitted = await db.$queryRaw<Array<{ admittedAt: Date | null }>>`SELECT "admittedAt" FROM attendance WHERE "liveClassId" = ${classId} AND "userId" = ${session.user.id}`;
      if (!access || !["ACTIVE", "PARTIALLY_PAID", "COMPLETED"].includes(access.status) || getAccessLevel(access) === "NONE" || !admitted[0]?.admittedAt) return NextResponse.json({ error: "Class admission required" }, { status: 403 });
    } else if (!can(session.user.role, "classes.manage")) {
      return NextResponse.json({ error: "Class access denied" }, { status: 403 });
    }
  }
  if (hasClassId || leave) {
    await db.$executeRaw`INSERT INTO platform_presence ("userId", "lastSeenAt", "currentClassId", "updatedAt") VALUES (${session.user.id}, NOW(), ${leave ? null : classId}, NOW()) ON CONFLICT ("userId") DO UPDATE SET "lastSeenAt" = NOW(), "currentClassId" = ${leave ? null : classId}, "updatedAt" = NOW()`;
  } else {
    await db.$executeRaw`INSERT INTO platform_presence ("userId", "lastSeenAt", "updatedAt") VALUES (${session.user.id}, NOW(), NOW()) ON CONFLICT ("userId") DO UPDATE SET "lastSeenAt" = NOW(), "updatedAt" = NOW()`;
  }
  if (classId && leave) await db.$executeRaw`UPDATE attendance SET "leftAt" = NOW() WHERE "liveClassId" = ${classId} AND "userId" = ${session.user.id} AND "joinedAt" IS NOT NULL`;
  if (classId && !leave) await db.$executeRaw`UPDATE attendance SET "joinedAt" = COALESCE("joinedAt", NOW()), "leftAt" = NULL WHERE "liveClassId" = ${classId} AND "userId" = ${session.user.id} AND "admittedAt" IS NOT NULL`;
  try {
    if (leave) await redis.del(`presence:${session.user.id}`);
    else await redis.set(`presence:${session.user.id}`, JSON.stringify({ lastSeenAt: Date.now(), classId }), "EX", 90);
    const currentPresence = await redis.get(`presence:${session.user.id}`);
    await redis.publish("presence:events", JSON.stringify({ userId: session.user.id, presence: currentPresence ? JSON.parse(currentPresence) : null }));
  } catch { /* the database heartbeat remains available when Redis is offline */ }
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
