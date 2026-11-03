import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";


export const metadata = { title: "Courses - Director" };

export default async function DirectorCoursesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) redirect("/login");

  const courses = await db.course.findMany({
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      courseCode: true,
      status: true,
      durationWeeks: true,
      createdAt: true,
      tutor: { select: { name: true } },
      _count: { select: { enrolments: true, blocks: true } },
    },
  });

  const STATUS_STYLE: Record<string, string> = {
    PUBLISHED: "badge-success",
    DRAFT: "badge-warning",
    ARCHIVED: "badge-danger",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Courses</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {courses.length} course{courses.length !== 1 ? "s" : ""} &mdash; read-only overview
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Code</th>
              <th className="pb-2 font-medium pr-4">Title</th>
              <th className="pb-2 font-medium pr-4">Instructor</th>
              <th className="pb-2 font-medium pr-4">Enrolments</th>
              <th className="pb-2 font-medium pr-4">Blocks</th>
              <th className="pb-2 font-medium pr-4">Duration</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {courses.map((c) => (
              <tr key={c.id} className="hover:bg-surface/40">
                <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">{c.courseCode ?? "-"}</td>
                <td className="py-2.5 pr-4 font-medium text-primary">{c.title}</td>
                <td className="py-2.5 pr-4 text-xs text-gray-500">{c.tutor?.name ?? "Unassigned"}</td>
                <td className="py-2.5 pr-4 text-center font-semibold">{c._count.enrolments}</td>
                <td className="py-2.5 pr-4 text-center">{c._count.blocks}</td>
                <td className="py-2.5 pr-4 text-xs text-gray-500">
                  {c.durationWeeks ? `${c.durationWeeks} wks` : "-"}
                </td>
                <td className="py-2.5">
                  <span className={`badge text-xs ${STATUS_STYLE[c.status] ?? "badge-info"}`}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {courses.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">No courses found.</p>
        )}
      </div>
    </div>
  );
}
