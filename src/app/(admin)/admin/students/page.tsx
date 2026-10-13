import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";

export const metadata = { title: "Students — Admin" };

interface Props {
  searchParams: { q?: string; page?: string };
}

export default async function AdminStudentsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/dashboard");

  const q = searchParams.q?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 20;
  const skip = (page - 1) * take;

  const where = q
    ? {
        role: "STUDENT" as const,
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { studentNumber: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : { role: "STUDENT" as const };

  const [students, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: { _count: { select: { enrolments: true } } },
    }),
    db.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / take);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">Students</h1>
        <div className="flex gap-2">
          <a
            href="/api/admin/students/export"
            className="btn-outline text-sm no-underline"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Search */}
      <form method="GET" className="mb-6 flex gap-3">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search by name, email, student number…"
          className="input max-w-sm"
        />
        <button type="submit" className="btn-primary text-sm">Search</button>
        {q && (
          <a href="/admin/students" className="btn-ghost text-sm no-underline">
            Clear
          </a>
        )}
      </form>

      <div className="card overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">
            {total.toLocaleString()} student{total !== 1 ? "s" : ""}
            {q && ` matching "${q}"`}
          </p>
        </div>

        {students.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No students found.</p>
        ) : (
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Student #</th>
                <th className="pb-2 font-medium pr-4">Name</th>
                <th className="pb-2 font-medium pr-4">Email</th>
                <th className="pb-2 font-medium pr-4">Phone</th>
                <th className="pb-2 font-medium pr-4">Status</th>
                <th className="pb-2 font-medium pr-4 text-center">Enrolments</th>
                <th className="pb-2 font-medium pr-4">Joined</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="py-2 pr-4 font-mono text-xs text-gray-400">
                    {s.studentNumber ?? "—"}
                  </td>
                  <td className="py-2 pr-4 font-medium">{s.name}</td>
                  <td className="py-2 pr-4 text-gray-500">{s.email ?? "—"}</td>
                  <td className="py-2 pr-4 text-gray-500">{s.phone ?? "—"}</td>
                  <td className="py-2 pr-4">
                    {s.status === "ACTIVE" ? (
                      <span className="badge badge-success">Active</span>
                    ) : s.status === "SUSPENDED" ? (
                      <span className="badge badge-danger">Suspended</span>
                    ) : (
                      <span className="badge badge-warning">Pending</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-center">{s._count.enrolments}</td>
                  <td className="py-2 pr-4 text-gray-400 text-xs">
                    {new Date(s.createdAt).toLocaleDateString("en-UG")}
                  </td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/students/${s.id}`}
                        className="text-xs text-accent no-underline hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/students?q=${q}&page=${page - 1}`}
                  className="btn-outline text-xs px-3 py-1.5 no-underline"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/students?q=${q}&page=${page + 1}`}
                  className="btn-primary text-xs px-3 py-1.5 no-underline"
                >
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
