import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";

const ReplySchema = z.object({
  threadId: z.string().cuid(),
  body: z.string().min(1).max(5000),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = ReplySchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const thread = await db.forumThread.findUnique({ where: { id: body.data.threadId } });
  if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  if (thread.locked) return NextResponse.json({ error: "Thread is locked" }, { status: 403 });

  // Check enrolment or staff
  const isStaff = can(session.user.role, "classes.view");
  if (!isStaff) {
    const enrolment = await db.enrolment.findFirst({
      where: { userId: session.user.id, courseId: thread.courseId, status: { in: ["ACTIVE", "COMPLETED"] } },
    });
    if (!enrolment) return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
  }

  const reply = await db.forumReply.create({
    data: { threadId: body.data.threadId, authorId: session.user.id, body: body.data.body },
  });

  // Update thread updatedAt
  await db.forumThread.update({ where: { id: body.data.threadId }, data: { updatedAt: new Date() } });

  return NextResponse.json({ id: reply.id });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const replyId = searchParams.get("replyId");
  if (!replyId) return NextResponse.json({ error: "Missing replyId" }, { status: 400 });

  const reply = await db.forumReply.findUnique({
    where: { id: replyId },
    select: { id: true, authorId: true, thread: { select: { courseId: true } } },
  });
  if (!reply) return NextResponse.json({ error: "Reply not found" }, { status: 404 });

  const isAuthor = reply.authorId === session.user.id;
  const isStaff = can(session.user.role, "classes.view");
  if (!isAuthor && !isStaff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Soft delete - set deletedAt
  await db.forumReply.update({
    where: { id: replyId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
