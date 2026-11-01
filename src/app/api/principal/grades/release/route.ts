/**
 * POST /api/principal/grades/release
 *
 * Releases (publishes) final results for a given exam or assignment item,
 * setting releasedAt on all matching GradeEntry rows.
 * Once released, a grade cannot be changed without a MARKS_CHANGE approval.
 *
 * Required permission: exams.release (DIRECTOR or PRINCIPAL).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

const ReleaseSchema = z.object({
  courseId:  z.string().cuid(),
  itemType:  z.enum(["EXAM", "ASSIGNMENT"]),
  itemId:    z.string().cuid(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user.role, "exams.release")) {
    return NextResponse.json(
      { error: "Forbidden: only the Principal or Director may release results." },
      { status: 403 }
    );
  }

  const parsed = ReleaseSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { courseId, itemType, itemId } = parsed.data;

  const course = await db.course.findUnique({ where: { id: courseId }, select: { id: true, title: true } });
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });

  const now = new Date();

  const { count } = await db.gradeEntry.updateMany({
    where: {
      courseId,
      itemType,
      itemId,
      releasedAt: null,
    },
    data: { releasedAt: now },
  });

  await audit({
    actorId:    session.user.id,
    action:     "GRADE_RELEASED",
    entityType: "GradeEntry",
    entityId:   itemId,
    metadata:   { courseId, itemType, itemId, count, via: session.user.role },
    ip:         req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ released: count, releasedAt: now.toISOString() });
}
