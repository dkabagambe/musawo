import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

export const metadata = { title: "Discussion Forum - Teaching Portal" };

export default async function TutorForumPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const courses = await db.course.findMany({
    where: teachingCourseWhere(session.user.id),
    select: { id: true, title: true },
  });

  const courseIds = courses.map((c) => c.id);

  const threads = await db.forumThread.findMany({
    where: courseIds.length ? { courseId: { in: courseIds } } : { id: "" },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      author: { select: { name: true, role: true } },
      course: { select: { title: true } },
      _count: { select: { replies: true } },
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Discussion Forum</h1>
          <p className="text-sm text-gray-500 mt-1">Threads for your courses</p>
        </div>
        <Link href="/tutor/forum/new" className="btn-secondary text-sm no-underline">
          New thread
        </Link>
      </div>

      {threads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-primary/40" />
          </div>
          <p className="text-gray-500 text-sm">No discussion threads yet.</p>
          <Link href="/tutor/forum/new" className="btn-secondary text-sm no-underline mt-4 inline-flex">
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
