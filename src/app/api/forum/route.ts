import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";

const CreateThreadSchema = z.object({
  courseId: z.string().cuid(),
  // Optional scoping: a thread can be tied to a live class or a group
  liveClassId: z.string().cuid().optional().nullable(),
  groupId: z.string().cuid().optional().nullable(),
  title: z.string().min(3).max(200),
  body: z.string().min(1).max(10000),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const liveClassId = searchParams.get("liveClassId");
  const groupId = searchParams.get("groupId");

  const isStaff = can(session.user.role, "classes.view") && !can(session.user.role, "classes.join");

  let courseIds: string[] = [];

  if (!isStaff) {
    const enrolments = await db.enrolment.findMany({
      where: {
        userId: session.user.id,
        status: { in: ["ACTIVE", "COMPLETED", "PARTIALLY_PAID", "OVERDUE"] },
      },
      select: { courseId: true },
    });
    courseIds = enrolments.map((e) => e.courseId);
  }

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  if (liveClassId) {
    where.liveClassId = liveClassId;
    if (groupId) where.groupId = groupId;
  } else if (courseId) {
    if (!isStaff && !courseIds.includes(courseId)) {
      return NextResponse.json({ threads: [] });
    }
    where.courseId = courseId;
    where.liveClassId = null; // course-level threads only (not class-specific)
  } else {
    where.courseId = isStaff ? undefined : { in: courseIds };
    where.liveClassId = null; // default to course-level only
  }

  const threads = await db.forumThread.findMany({
    where,
    include: {
      author: { select: { name: true, role: true } },
      course: { select: { title: true } },
      _count: { select: { replies: true } },
    },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: 100,
  });

  return NextResponse.json({ threads });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CreateThreadSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const { courseId, liveClassId, groupId, title, body } = parsed.data;

  const isStaff = can(session.user.role, "classes.view") && !can(session.user.role, "classes.join");

  if (!isStaff) {
    const enrolment = await db.enrolment.findFirst({
      where: {
        userId: session.user.id,
        courseId,
        status: { in: ["ACTIVE", "COMPLETED", "PARTIALLY_PAID", "OVERDUE"] },
      },
    });
    if (!enrolment) return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 });

    // If posting to a group thread, verify membership
    if (groupId) {
      const membership = await db.classGroupMember.findFirst({
        where: { userId: session.user.id, groupId },
      });
      // Also allow instructor of the class
      if (!membership) return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }
  }

  // Verify liveClassId belongs to this course
  if (liveClassId) {
    const lc = await db.liveClass.findFirst({ where: { id: liveClassId, courseId } });
    if (!lc) return NextResponse.json({ error: "Class not found in this course" }, { status: 404 });
  }

  const thread = await db.forumThread.create({
    data: {
      courseId,
      liveClassId: liveClassId ?? undefined,
      groupId: groupId ?? undefined,
      authorId: session.user.id,
      title,
      body,
    },
  });

  return NextResponse.json({ id: thread.id }, { status: 201 });
}
