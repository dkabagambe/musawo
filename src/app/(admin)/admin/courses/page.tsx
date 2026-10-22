import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";

export const metadata = { title: "Courses - Admin" };

export default async function AdminCoursesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view"))
    redirect("/403");

  const courses = await db.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tutor: { select: { name: true } },
      _count: { select: { enrolments: true, blocks: true } },
      blocks: { select: { _count: { select: { lessons: true } } } },
    },
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">Courses</h1>
      </div>

      <div className="card overflow-x-auto">
        {courses.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">
            No courses yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Title</th>
                <th className="pb-2 font-medium pr-4">Tutor</th>
                <th className="pb-2 font-medium pr-4">Status</th>
                <th className="pb-2 font-medium pr-4 text-center">Blocks</th>
                <th className="pb-2 font-medium pr-4 text-center">Lessons</th>
                <th className="pb-2 font-medium pr-4 text-center">Enrolled</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {courses.map((c) => {
                const totalLessons = c.blocks.reduce(
                  (s, b) => s + b._count.lessons,
                  0,
                );
                return (
                  <tr key={c.id}>
                    <td className="py-2 pr-4 font-medium max-w-xs">
                      <p className="truncate">{c.title}</p>
                      <p className="text-xs text-gray-400 font-mono">
                        {c.slug}
                      </p>
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{c.tutor.name}</td>
                    <td className="py-2 pr-4">
                      {c.status === "PUBLISHED" ? (
                        <span className="badge badge-success">Published</span>
                      ) : c.status === "DRAFT" ? (
                        <span className="badge badge-warning">Draft</span>
                      ) : (
                        <span className="badge badge-danger">Archived</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-center">{c._count.blocks}</td>
                    <td className="py-2 pr-4 text-center">{totalLessons}</td>
                    <td className="py-2 pr-4 text-center">
                      {c._count.enrolments}
                    </td>
                    <td className="py-2">
                      <div className="flex gap-3">
                        <Link
                          href={`/courses/${c.slug}`}
                          target="_blank"
                          className="text-xs text-accent no-underline hover:underline"
                        >
                          View ↗
                        </Link>
                        <ToggleStatusButton
                          courseId={c.id}
                          currentStatus={c.status}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Inline client component for toggling publish status
function ToggleStatusButton({
  courseId,
  currentStatus,
}: {
  courseId: string;
  currentStatus: string;
}) {
  const nextStatus = currentStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
  const label = currentStatus === "PUBLISHED" ? "Unpublish" : "Publish";
  return (
    <form
      action={`/api/admin/courses/${courseId}`}
      method="POST"
      className="inline"
    >
      <input type="hidden" name="_method" value="PATCH" />
      <input type="hidden" name="status" value={nextStatus} />
      <button
        type="submit"
        className={`text-xs no-underline hover:underline ${
          currentStatus === "PUBLISHED" ? "text-danger" : "text-success"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
