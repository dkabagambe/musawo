import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { can } from "@/lib/rbac";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "courses.view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const courses = await db.course.findMany({
    where: { ...teachingCourseWhere(session.user.id), status: "PUBLISHED" },
    include: {
      blocks: { orderBy: { order: "asc" }, select: { id: true, title: true, order: true } },
    },
  });

  return NextResponse.json({ courses, canManageClasses: can(session.user.role, "classes.manage") });
}
