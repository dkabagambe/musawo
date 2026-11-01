import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

export const metadata = { title: "Discussion Forum - Teaching Portal" };

export default async function TutorForumPage({
  searchParams,
}: {
  searchParams: { classId?: string; groupId?: string; courseId?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { classId, groupId } = searchParams;

  const courses = await db.course.findMany({
    where: teachingCourseWhere(session.user.id),
    select: { id: true, title: true },
  });

  const courseIds = courses.map((c) => c.id);

  // Scope label
  let scopeLabel = "Discussion Forum";
  let backHref: string | null = null;

  if (classId) {
    const lc = await db.liveClass.findFirst({
      where: { id: classId, courseId: { in: courseIds }, tutorId: session.user.id },
      select: { title: true },
    });
    if (lc) {
      scopeLabel = `Class: ${lc.title}`;
      backHref = "/tutor/classes";
    }
  }

  let groupName: string | null = null;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (classId && groupId) {
    where.liveClassId = classId;
    where.groupId = groupId;
  } else if (classId) {
    where.liveClassId = classId;
    where.groupId = null;
  } else {
    where.courseId = courseIds.length ? { in: courseIds } : { equals: "" };
    where.liveClassId = null;
  }

  const threads = await db.forumThread.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      author: { select: { name: true, role: true } },
      course: { select: { title: true } },
      _count: { select: { replies: true } },
    },
  });

  const newHref = classId
    ? `/tutor/forum/new?classId=${classId}${groupId ? `&groupId=${groupId}` : ""}${searchParams.courseId ? `&courseId=${searchParams.courseId}` : ""}`
    : "/tutor/forum/new";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {backHref && (
        <Link href={backHref} className="text-sm text-gray-400 hover:text-primary no-underline block">
          &larr; Back to My Classes
        </Link>
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">{scopeLabel}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {groupName ? `Group discussion thread` : classId ? `Class discussion threads` : `Threads for your courses`}
          </p>
        </div>
        <Link href={newHref} className="btn-secondary text-sm no-underline">
          New thread
        </Link>
      </div>

      {threads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-primary/40" />
          </div>
          <p className="text-gray-500 text-sm">No discussion threads yet.</p>
          <Link href={newHref} className="btn-secondary text-sm no-underline mt-4 inline-flex">
            Start the first thread
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/forum/${t.id}`}
              className="card flex items-start gap-4 hover:shadow-md transition-shadow no-underline block"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {t.pinned && <span className="badge badge-info text-xs">Pinned</span>}
                  {t.locked && <span className="badge text-xs">Locked</span>}
                  <h2 className="font-semibold text-sm text-primary">{t.title}</h2>
                </div>
                <p className="text-xs text-gray-500">
                  {t.course.title} &middot; {t.author.name} &middot; {t._count.replies} repl{t._count.replies !== 1 ? "ies" : "y"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Last updated {new Date(t.updatedAt).toLocaleDateString("en-UG")}
                </p>
              </div>
              <MessageSquare className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
