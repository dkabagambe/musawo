import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, ForbiddenError, requirePermission } from "@/lib/rbac";
import { canAccessTeachingCourse } from "@/lib/teaching/scope";
import { audit } from "@/lib/audit";
import { z } from "zod";

/** GET /api/announcements - site-wide + course announcements for enrolled student */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id, status: { in: ["ACTIVE", "COMPLETED"] } },
    select: { courseId: true },
  });
  const courseIds = enrolments.map((e) => e.courseId);

  const announcements = await db.announcement.findMany({
    where: {
      OR: [
        { courseId: null },
        { courseId: { in: courseIds } },
      ],
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 30,
    include: {
      author: { select: { name: true } },
      course: { select: { title: true } },
    },
  });

  return NextResponse.json({ announcements });
}

const CreateSchema = z.object({ courseId: z.string().cuid(), title: z.string().min(3).max(160), body: z.string().min(3).max(10000) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid announcement" }, { status: 400 });

  const ownClassPermission = can(session.user.role, "announcements.send.own");
  const allClassPermission = can(session.user.role, "announcements.send.all");
  if (!ownClassPermission && !allClassPermission) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (ownClassPermission && !allClassPermission && !await canAccessTeachingCourse(parsed.data.courseId, session.user.id)) {
    return NextResponse.json({ error: "You can only announce to an assigned course." }, { status: 403 });
  }
  try { requirePermission(session.user.role, ownClassPermission ? "announcements.send.own" : "announcements.send.all"); }
  catch (error) { if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 }); throw error; }

  const course = await db.course.findUnique({ where: { id: parsed.data.courseId }, select: { id: true, title: true } });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  const recipients = await db.enrolment.findMany({
    where: { courseId: course.id, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] } },
    select: { userId: true },
  });
  const announcement = await db.$transaction(async (tx) => {
    const created = await tx.announcement.create({ data: { courseId: course.id, authorId: session.user.id, title: parsed.data.title, body: parsed.data.body } });
    if (recipients.length) await tx.notification.createMany({ data: recipients.map(({ userId }) => ({ userId, channel: "IN_APP" as const, type: "COURSE_ANNOUNCEMENT", subject: parsed.data.title, body: parsed.data.body, metadata: { courseId: course.id, announcementId: created.id } })) });
    return created;
  });
  await audit({ actorId: session.user.id, action: "CREATE", entityType: "Announcement", entityId: announcement.id, metadata: { courseId: course.id, recipientCount: recipients.length } });
  return NextResponse.json({ announcement, recipientCount: recipients.length }, { status: 201 });
}
