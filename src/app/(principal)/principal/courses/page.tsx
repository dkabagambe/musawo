import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata = { title: "Courses - Principal" };

export default async function PrincipalCoursesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "content.approve")) redirect("/dashboard");

  const courses = await db.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tutor: { select: { name: true } },
      _count: { select: { enrolments: true, blocks: true } },
    },
  });

  const STATUS_COLOURS: Record<string, string> = {
    PUBLISHED: "badge-success",
    DRAFT:     "badge-warning",
    ARCHIVED:  "badge-neutral",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Courses</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review and approve course content</p>
      </div>

      <div className="card overflow-x-auto">
        {courses.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No courses yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Title</th>
                <th className="pb-2 font-medium pr-4">Instructor</th>
                <th className="pb-2 font-medium pr-4">Category</th>
                <th className="pb-2 font-medium pr-4">Status</th>
                <th className="pb-2 font-medium pr-4 text-center">Blocks</th>
                <th className="pb-2 font-medium pr-4 text-center">Enrolled</th>
                <th className="pb-2 font-medium pr-4">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-surface/50 transition-colors">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium text-primary">{c.title}</p>
                    <p className="text-xs text-gray-400">/{c.slug}</p>
                  </td>
                  <td className="py-2.5 pr-4 text-sm text-gray-600">{c.tutor.name}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`badge text-xs ${c.category === "PROFESSIONAL" ? "badge-info" : "badge-neutral"}`}>
                      {c.category}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={`badge text-xs ${STATUS_COLOURS[c.status] ?? "badge-neutral"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-center text-sm">{c._count.blocks}</td>
                  <td className="py-2.5 pr-4 text-center text-sm">{c._count.enrolments}</td>
                  <td className="py-2.5 pr-4 text-xs text-gray-400 max-w-[120px] truncate">
                    {c.contentNote ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
