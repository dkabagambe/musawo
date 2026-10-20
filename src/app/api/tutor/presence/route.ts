import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { redis } from "@/lib/db/redis";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "attendance.view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const courseId = new URL(req.url).searchParams.get("courseId");
  const allCourses = can(session.user.role, "attendance.view.all");
  const courses = await db.course.findMany({ where: courseId ? { id: courseId, ...(allCourses ? {} : teachingCourseWhere(session.user.id)) } : allCourses ? {} : teachingCourseWhere(session.user.id), select: { id: true } });
  if (courseId && !courses.length) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  const courseIds = courses.map((course) => course.id);
  const rows = courseIds.length ? await db.$queryRaw<Array<{ id: string; name: string; studentNumber: string | null; lastSeenAt: Date | null; currentClassId: string | null; classTitle: string | null; joinedAt: Date | null }>>`
    SELECT DISTINCT u.id, u.name, u."studentNumber", p."lastSeenAt", p."currentClassId", lc.title AS "classTitle", a."joinedAt"
    FROM enrolments e JOIN users u ON u.id = e."userId"
    LEFT JOIN platform_presence p ON p."userId" = u.id
    LEFT JOIN live_classes lc ON lc.id = p."currentClassId" AND lc.status = 'LIVE'
    LEFT JOIN attendance a ON a."liveClassId" = lc.id AND a."userId" = u.id
    WHERE e."courseId" IN (${(await import("@prisma/client")).Prisma.join(courseIds)}) AND e.status IN ('ACTIVE','PARTIALLY_PAID','COMPLETED') AND u.role = 'STUDENT'
    ORDER BY u.name ASC
  ` : [];
  const now = Date.now();
  let redisOnline = new Set<string>();
  try {
    const keys = rows.map((row) => `presence:${row.id}`);
    const values = keys.length ? await redis.mget(...keys) : [];
    redisOnline = new Set(rows.filter((_, index) => Boolean(values[index])).map((row) => row.id));
  } catch { /* lastSeenAt provides the database fallback */ }
  const students = rows.map((row) => ({
    id: row.id, name: row.name, studentNumber: row.studentNumber,
    status: row.currentClassId && row.joinedAt && (redisOnline.has(row.id) || row.lastSeenAt && now - row.lastSeenAt.getTime() < 90_000) ? "in_class" : redisOnline.has(row.id) || row.lastSeenAt && now - row.lastSeenAt.getTime() < 90_000 ? "online" : "offline",
    classTitle: row.classTitle,
    lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
  }));
  return NextResponse.json({ online: students.filter((student) => student.status !== "offline").length, inClass: students.filter((student) => student.status === "in_class").length, total: students.length, students });
}
