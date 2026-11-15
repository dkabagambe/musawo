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

  // Notify students whose results were just released
  if (count > 0) {
    const releasedEntries = await db.gradeEntry.findMany({
      where: { courseId, itemType, itemId, releasedAt: { not: null } },
      select: { userId: true, itemTitle: true },
    });
    const itemTitle = releasedEntries[0]?.itemTitle ?? itemId;
    for (const entry of releasedEntries) {
      await db.notification.create({
        data: {
          userId: entry.userId,
          channel: "IN_APP",
          type: "RESULTS_PUBLISHED",
          subject: `Results published: ${itemTitle}`,
          body: `Your results for "${itemTitle}" have been published. Visit My Results to see your score.`,
          metadata: { courseId, itemType, itemId },
        },
      });
    }
  }

  return NextResponse.json({ released: count, releasedAt: now.toISOString() });
}
