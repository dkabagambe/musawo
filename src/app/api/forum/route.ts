import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";

const CreateThreadSchema = z.object({
  courseId: z.string().cuid(),
  title: z.string().min(3).max(200),
  body: z.string().min(1).max(10000),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");

  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id, status: { in: ["ACTIVE", "COMPLETED"] } },
    select: { courseId: true },
  });
  const courseIds = enrolments.map((e) => e.courseId);

  const threads = await db.forumThread.findMany({
    where: {
      courseId: courseId ? courseId : { in: courseIds },
    },
    include: {
      author: { select: { name: true, role: true } },
      course: { select: { title: true } },
      _count: { select: { replies: true } },
    },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: 50,
  });

  return NextResponse.json({ threads });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CreateThreadSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { courseId, title, body } = parsed.data;

  const isStaff = can(session.user.role, "classes.view");
  if (!isStaff) {
    const enrolment = await db.enrolment.findFirst({
      where: { userId: session.user.id, courseId, status: { in: ["ACTIVE", "COMPLETED"] } },
    });
    if (!enrolment) return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 });
  }

  const thread = await db.forumThread.create({
    data: { courseId, authorId: session.user.id, title, body },
  });

  return NextResponse.json({ id: thread.id }, { status: 201 });
}
