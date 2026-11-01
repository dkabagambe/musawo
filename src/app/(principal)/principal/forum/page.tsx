import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";

export const metadata = { title: "Discussion Forum - Principal" };

interface Props {
  searchParams: { courseId?: string };
}

export default async function PrincipalForumPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) redirect("/403");

  const courses = await db.course.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  const selectedCourseId = searchParams.courseId ?? courses[0]?.id ?? null;

  const threads = selectedCourseId
    ? await db.forumThread.findMany({
        where: { courseId: selectedCourseId },
        orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
        take: 30,
        include: {
          author: { select: { name: true, role: true } },
          _count: { select: { replies: true } },
        },
      })
    : [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Discussion Forum</h1>
        <p className="text-sm text-gray-500 mt-1">
          View and moderate course discussion threads
        </p>
      </div>

      {/* Course selector */}
      {courses.length > 0 && (
        <form method="GET" className="flex gap-3 mb-6 items-center">
          <label className="text-sm font-medium text-gray-600">Programme:</label>
          <select name="courseId" className="input w-auto" defaultValue={selectedCourseId ?? ""}>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary text-sm">View</button>
        </form>
      )}

      {threads.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">💬</p>
          <p className="text-gray-500 text-sm">No discussion threads yet in this programme.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((t) => (
            <div key={t.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {t.pinned && <span className="badge badge-info text-xs">Pinned</span>}
                    {t.locked && <span className="badge badge-danger text-xs">Locked</span>}
                    <h2 className="font-semibold text-sm">{t.title}</h2>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{t.body}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {t.author.name} ({t.author.role.replace(/_/g, " ")}) &middot;{" "}
                    {new Date(t.createdAt).toLocaleDateString("en-UG")}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-primary">{t._count.replies}</p>
                  <p className="text-xs text-gray-400">replies</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
