import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

export const metadata = { title: "Discussion Forum" };

export default async function ForumPage({ searchParams }: { searchParams: { classId?: string; groupId?: string; courseId?: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { classId, groupId, courseId: qCourseId } = searchParams;

  // Get courses the student is enrolled in
  const enrolments = await db.enrolment.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["ACTIVE", "COMPLETED", "PARTIALLY_PAID", "OVERDUE"] },
    },
    include: { course: { select: { id: true, title: true, slug: true } } },
  });

  const courseIds = enrolments.map((e) => e.courseId);

  // Determine scope label
  let scopeLabel = "Discussion Forum";
  let backHref = "/dashboard/forum";
  let liveClass: { id: string; title: string; courseId: string } | null = null;
  let groupName: string | null = null;

  if (classId) {
    liveClass = await db.liveClass.findFirst({
      where: { id: classId, courseId: { in: courseIds } },
      select: { id: true, title: true, courseId: true },
    });
    if (!liveClass) redirect("/dashboard/forum");
    scopeLabel = `Class: ${liveClass.title}`;
    backHref = "/dashboard/classes";
  }

  if (groupId && classId) {
    const grp = await db.classGroup.findFirst({
      where: { id: groupId, liveClassId: classId },
      select: { name: true },
    });
    if (grp) {
      groupName = grp.name;
      scopeLabel = `Group: ${grp.name}`;
    }
  }

  // Build query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (classId && groupId) {
    where.liveClassId = classId;
    where.groupId = groupId;
  } else if (classId) {
    where.liveClassId = classId;
    where.groupId = null;
  } else {
    where.courseId = qCourseId ? qCourseId : { in: courseIds };
    where.liveClassId = null;
  }

  const threads = await db.forumThread.findMany({
    where,
    include: {
      author: { select: { name: true, role: true } },
      course: { select: { title: true, slug: true } },
      _count: { select: { replies: true } },
    },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: 50,
  });

  // New thread URL with context
  const newThreadHref = classId
    ? `/dashboard/forum/new?classId=${classId}${groupId ? `&groupId=${groupId}` : ""}${liveClass ? `&courseId=${liveClass.courseId}` : ""}`
    : `/dashboard/forum/new`;

  return (
    <div className="max-w-3xl mx-auto">
      {classId && (
        <Link href={backHref} className="text-sm text-gray-400 hover:text-primary no-underline mb-4 block">
          &larr; Back to Live Classes
        </Link>
      )}

      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl">{scopeLabel}</h1>
          {groupName && <p className="text-sm text-gray-500 mt-0.5">Group discussion thread</p>}
          {classId && !groupName && <p className="text-sm text-gray-500 mt-0.5">Class discussion threads</p>}
        </div>
        <Link href={newThreadHref} className="btn-primary text-sm no-underline">
          + New thread
        </Link>
      </div>

      {threads.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-4xl mb-3" aria-hidden="true">
            <MessageSquare className="w-10 h-10 mx-auto text-gray-300" />
          </p>
          <p className="text-gray-500 text-sm mb-4">No discussions yet. Start the first one!</p>
          <Link href={newThreadHref} className="btn-primary no-underline">
            Start a discussion
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {threads.map((thread) => (
          <Link
            key={thread.id}
            href={`/dashboard/forum/${thread.id}`}
            className="card flex items-start gap-4 hover:shadow-md transition-shadow no-underline block"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {thread.pinned && <span className="text-xs text-accent font-medium">Pinned</span>}
                <span className="badge-info badge text-xs">{thread.course.title}</span>
              </div>
              <p className="font-medium text-primary">{thread.title}</p>
              <p className="text-xs text-gray-400 mt-1">
                by {thread.author.name}
                {can(thread.author.role as Parameters<typeof can>[0], "classes.view") && !can(thread.author.role as Parameters<typeof can>[0], "learning.self.view") && (
                  <span className="ml-1 badge-success badge text-xs">Staff</span>
                )}
                {" "}
                {new Date(thread.updatedAt).toLocaleDateString("en-UG")}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold text-gray-300">{thread._count.replies}</p>
              <p className="text-xs text-gray-400">replies</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
