import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
export const dynamic = "force-dynamic";

export const metadata = { title: "Courses - Registrar" };

interface Props {
  searchParams: { q?: string; status?: string };
}

export default async function RegistrarCoursesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) redirect("/registrar");

  const q = searchParams.q?.trim() ?? "";
  const status = searchParams.status ?? "ALL";

  const courses = await db.course.findMany({
    where: {
      ...(status !== "ALL" ? { status: status as "PUBLISHED" | "DRAFT" | "ARCHIVED" } : {}),
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { title: "asc" },
    include: {
      tutor: { select: { name: true } },
      _count: { select: { enrolments: true, blocks: true, exams: true } },
    },
  });

  const STATUS_BADGE: Record<string, string> = {
    PUBLISHED: "badge-success",
    DRAFT:     "badge-warning",
    ARCHIVED:  "badge-danger",
  };

  const STATUS_OPTS = ["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"] as const;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Courses</h1>
        <p className="text-sm text-gray-500 mt-0.5">All courses in the system — read-only</p>
      </div>

      <form method="GET" className="flex flex-wrap gap-3 items-center">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search course title..."
          className="input max-w-xs"
        />
        <select name="status" defaultValue={status} className="input w-40">
          {STATUS_OPTS.map((s) => (
            <option key={s} value={s}>{s === "ALL" ? "All statuses" : s}</option>
          ))}
        </select>
        <button type="submit" className="btn-primary text-sm">Filter</button>
        {(q || status !== "ALL") && (
          <a href="/registrar/courses" className="btn-ghost text-sm no-underline">Clear</a>
        )}
      </form>

      <div className="card overflow-x-auto">
        {courses.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No courses match your filter.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Title</th>
                <th className="pb-2 font-medium pr-4">Code</th>
                <th className="pb-2 font-medium pr-4">Instructor</th>
                <th className="pb-2 font-medium pr-4">Category</th>
                <th className="pb-2 font-medium pr-4">Status</th>
                <th className="pb-2 font-medium pr-4 text-center">Blocks</th>
                <th className="pb-2 font-medium pr-4 text-center">Exams</th>
                <th className="pb-2 font-medium text-center">Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-surface/50 transition-colors">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium text-primary">{c.title}</p>
                    <p className="text-xs text-gray-400">/{c.slug}</p>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">
                    {c.courseCode ?? "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-sm text-gray-600">{c.tutor.name}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`badge text-xs ${c.category === "PROFESSIONAL" ? "badge-info" : "badge-neutral"}`}>
                      {c.category}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={`badge text-xs ${STATUS_BADGE[c.status] ?? "badge-neutral"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-center">{c._count.blocks}</td>
                  <td className="py-2.5 pr-4 text-center">{c._count.exams}</td>
                  <td className="py-2.5 text-center">{c._count.enrolments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-400">Showing {courses.length} course{courses.length !== 1 ? "s" : ""}.</p>
    </div>
  );
}
