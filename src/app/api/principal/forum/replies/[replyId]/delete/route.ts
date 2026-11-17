import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export async function POST(
  request: Request,
  { params }: { params: { replyId: string } }
) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "forum.moderate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { replyId } = params;
  const body = await request.json();
  const { reason } = body;

  if (!reason || reason.trim().length < 10) {
    return NextResponse.json(
      { error: "Reason is required (minimum 10 characters)" },
      { status: 400 }
    );
  }

  try {
    // Verify reply exists
    const reply = await db.forumReply.findUnique({
      where: { id: replyId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        thread: {
          select: {
            id: true,
            title: true,
            courseId: true,
            course: {
              select: {
                title: true,
                courseCode: true,
              },
            },
          },
        },
      },
    });

    if (!reply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    if (reply.deletedAt) {
      return NextResponse.json(
        { error: "Reply is already deleted" },
        { status: 400 }
      );
    }

    // Soft delete the reply
    const updated = await db.forumReply.update({
      where: { id: replyId },
      data: {
        deletedAt: new Date(),
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "FORUM_POST_DELETED",
        resource: "FORUM_REPLIES",
        resourceId: replyId,
        details: {
          replyId,
          threadId: reply.threadId,
          threadTitle: reply.thread.title,
          courseId: reply.thread.courseId,
          courseCode: reply.thread.course.courseCode,
          courseTitle: reply.thread.course.title,
          authorId: reply.authorId,
          authorName: reply.author.name,
          authorEmail: reply.author.email,
          bodyPreview: reply.body.substring(0, 100),
          reason,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Delete reply error:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
