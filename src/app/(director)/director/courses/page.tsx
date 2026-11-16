import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Courses - Director" };

interface Props {
  searchParams: { q?: string; status?: string; page?: string };
}

export default async function DirectorCoursesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) redirect("/login");

  const q      = searchParams.q?.trim() ?? "";
  const status = searchParams.status ?? "";
  const page   = Math.max(1, Number(searchParams.page ?? 1));
  const take   = 30;
  const skip   = (page - 1) * take;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { title:      { contains: q, mode: "insensitive" } },
      { courseCode: { contains: q, mode: "insensitive" } },
    ];
  }

  const [courses, total] = await Promise.all([
    db.course.findMany({
      where,
      orderBy: [{ status: "asc" }, { title: "asc" }],
      take,
      skip,
      select: {
        id: true, title: true, courseCode: true, status: true,
        durationMonths: true, durationWeeks: true, createdAt: true,
        tutor: { select: { id: true, name: true } },
        _count: { select: { enrolments: true, blocks: true, certificates: true } },
        intakes: {
          orderBy: { startDate: "desc" },
          take: 1,
          select: { label: true },
        },
      },
    }),
    db.course.count({ where }),
  ]);

  const totalPages = Math.ceil(total / take);

  // Pending change approvals
  const courseIds = courses.map((c) => c.id);
  const pendingChanges = await db.approvalRequest.findMany({
    where: {
      courseId: { in: courseIds },
      type:     { in: ["ACADEMIC_PROGRAMME_CHANGE", "COURSE_CHANGE"] },
      status:   { in: ["SUBMITTED", "IN_REVIEW"] },
    },
    select: { courseId: true, id: true, status: true },
  });
  const pendingByCourse: Record<string, string[]> = {};
  for (const pc of pendingChanges) {
    if (!pc.courseId) continue;
    if (!pendingByCourse[pc.courseId]) pendingByCourse[pc.courseId] = [];
    pendingByCourse[pc.courseId].push(pc.id);
  }

  const STATUS_STYLE: Record<string, string> = {
    PUBLISHED: "badge-success",
    DRAFT:     "badge-warning",
    ARCHIVED:  "badge-danger",
  };

  function qs(overrides: Record<string, string | number>) {
    const params = new URLSearchParams();
    if (q)      params.set("q",      q);
    if (status) params.set("status", status);
    for (const [k, v] of Object.entries(overrides)) {
      if (String(v)) params.set(k, String(v));
    }
    return `/director/courses?${params.toString()}`;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Courses</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {total} course{total !== 1 ? "s" : ""} - read only
          {pendingChanges.length > 0 && (
            <span className="ml-2 text-amber-600">
              &middot; {pendingChanges.length} pending approval{pendingChanges.length !== 1 ? "s" : ""}
            </span>
          )}
        </p>
      </div>

      <form method="GET" className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title or code..."
          className="input text-sm max-w-xs"
        />
        <select name="status" defaultValue={status} className="input text-sm">
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button type="submit" className="btn-secondary text-sm">Filter</button>
        {(q || status) && (
          <Link href="/director/courses" className="btn-ghost text-sm no-underline">Clear</Link>
        )}
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Code</th>
              <th className="pb-2 font-medium pr-4">Title</th>
              <th className="pb-2 font-medium pr-4">Lead instructor</th>
              <th className="pb-2 font-medium pr-4">Enrolments</th>
              <th className="pb-2 font-medium pr-4">Certificates</th>
              <th className="pb-2 font-medium pr-4">Status</th>
              <th className="pb-2 font-medium">Pending change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {courses.map((c) => {
              const pending = pendingByCourse[c.id] ?? [];
              return (
                <tr key={c.id} className="hover:bg-surface/40">
                  <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">
                    {c.courseCode ?? "-"}
                  </td>
                  <td className="py-2.5 pr-4">
                    <Link
                      href={`/director/courses/${c.id}`}
                      className="font-medium text-primary hover:underline no-underline"
                    >
                      {c.title}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">
                    {c.tutor?.name ?? "-"}
                  </td>
                  <td className="py-2.5 pr-4 text-center">{c._count.enrolments}</td>
                  <td className="py-2.5 pr-4 text-center">{c._count.certificates}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`badge text-xs ${STATUS_STYLE[c.status] ?? "badge-info"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-2.5">
                    {pending.length > 0 ? (
                      <Link
                        href={`/director/approvals/${pending[0]}`}
                        className="text-xs text-amber-600 hover:underline no-underline"
                      >
                        Review &rarr;
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-300">None</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {courses.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">No courses found.</p>
        )}

        {totalPages > 1 && (
          <div className="flex justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={qs({ page: page - 1 })} className="btn-outline text-xs px-3 py-1.5 no-underline">
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link href={qs({ page: page + 1 })} className="btn-primary text-xs px-3 py-1.5 no-underline">
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
