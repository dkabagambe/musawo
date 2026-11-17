import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export async function POST(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "forum.moderate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { threadId } = params;
  const body = await request.json();
  const { locked } = body;

  if (typeof locked !== "boolean") {
    return NextResponse.json(
      { error: "locked must be a boolean" },
      { status: 400 }
    );
  }

  try {
    // Verify thread exists
    const thread = await db.forumThread.findUnique({
      where: { id: threadId },
      include: {
        course: {
          select: {
            title: true,
            courseCode: true,
          },
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Update thread
    const updated = await db.forumThread.update({
      where: { id: threadId },
      data: { locked },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: locked ? "FORUM_THREAD_LOCKED" : "FORUM_THREAD_UNLOCKED",
        resource: "FORUM_THREADS",
        resourceId: threadId,
        details: {
          threadId,
          threadTitle: thread.title,
          courseId: thread.courseId,
          courseCode: thread.course.courseCode,
          courseTitle: thread.course.title,
          locked,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Thread ${locked ? "locked" : "unlocked"} successfully`,
    });
  } catch (error) {
    console.error("Lock thread error:", error);
    return NextResponse.json(
      { error: "Failed to update thread" },
      { status: 500 }
    );
  }
}
