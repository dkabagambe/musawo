import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";

export const metadata = { title: "Discussion Forum" };

export default async function ForumPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Get courses the student is enrolled in
  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id, status: { in: ["ACTIVE", "COMPLETED"] } },
    include: { course: { select: { id: true, title: true, slug: true } } },
  });

  const courseIds = enrolments.map((e) => e.courseId);

  const threads = await db.forumThread.findMany({
    where: { courseId: { in: courseIds } },
    include: {
      author: { select: { name: true, role: true } },
      course: { select: { title: true, slug: true } },
      _count: { select: { replies: true } },
    },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: 50,
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">Discussion Forum</h1>
        <Link href="/dashboard/forum/new" className="btn-primary text-sm no-underline">
          + New thread
        </Link>
      </div>

      {threads.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-4xl mb-3" aria-hidden="true">💬</p>
          <p className="text-gray-500 text-sm mb-4">No discussions yet. Start the first one!</p>
          <Link href="/dashboard/forum/new" className="btn-primary no-underline">
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
                {thread.pinned && <span className="text-xs text-accent font-medium">📌 Pinned</span>}
                <span className="badge-info badge text-xs">{thread.course.title}</span>
              </div>
              <p className="font-medium text-primary">{thread.title}</p>
              <p className="text-xs text-gray-400 mt-1">
                by {thread.author.name}
                {can(thread.author.role as Parameters<typeof can>[0], "courses.view") && !can(thread.author.role as Parameters<typeof can>[0], "learning.self.view") && (
                  <span className="ml-1 badge-success badge text-xs">Staff</span>
                )}
                {" · "}
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
