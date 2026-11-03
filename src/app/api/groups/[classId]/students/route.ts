/**
 * GET /api/groups/[classId]/students
 * Returns enrolled students for a live class - used by the manual group builder.
 * Only accessible to the class instructor and staff.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export async function GET(_req: NextRequest, { params }: { params: { classId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId } = params;

  const lc = await db.liveClass.findUnique({
    where: { id: classId },
    select: { courseId: true, tutorId: true },
  });
  if (!lc) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const isInstructor = can(session.user.role, "classes.manage") && lc.tutorId === session.user.id;
  const isStaff = can(session.user.role, "classes.view");

  if (!isInstructor && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const enrolments = await db.enrolment.findMany({
    where: {
      courseId: lc.courseId,
      user: { role: "STUDENT" },
      status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] },
    },
    select: {
      user: { select: { id: true, name: true, studentNumber: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  const students = enrolments.map(({ user }) => ({
    id: user.id,
    name: user.name,
    studentNumber: user.studentNumber,
  }));

  return NextResponse.json({ students });
}
