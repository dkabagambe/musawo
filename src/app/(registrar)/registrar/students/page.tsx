import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";

export const metadata = { title: "Students - Registrar" };

interface Props {
  searchParams: { q?: string; page?: string; status?: string };
}

export default async function RegistrarStudentsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/dashboard");

  const q = searchParams.q?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 20;
  const skip = (page - 1) * take;

  const statusFilter = searchParams.status as string | undefined;

  const where = {
    role: "STUDENT" as const,
    ...(statusFilter ? { status: statusFilter as never } : {}),
    ...(q ? {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { email: { contains: q, mode: "insensitive" as const } },
        { studentNumber: { contains: q, mode: "insensitive" as const } },
        { phone: { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [students, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        _count: { select: { enrolments: true } },
        enrolments: {
          select: { status: true, course: { select: { title: true } } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    db.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / take);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} total</p>
        </div>
        <div className="flex gap-2">
          <a href="/api/admin/students/export" className="btn-outline text-sm no-underline">Export CSV</a>
        </div>
      </div>

      {/* Search and filter */}
      <form method="GET" className="flex flex-wrap gap-3">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search name, email, student number..."
          className="input max-w-xs"
        />
        <select name="status" defaultValue={statusFilter ?? ""} className="input w-auto text-sm">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="PENDING_VERIFICATION">Pending verification</option>
          <option value="PENDING_ACCEPTANCE">Pending acceptance</option>
        </select>
        <button type="submit" className="btn-primary text-sm">Search</button>
        {(q || statusFilter) && (
          <a href="/registrar/students" className="btn-ghost text-sm no-underline">Clear</a>
        )}
      </form>

      <div className="card overflow-x-auto">
        {students.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No students found.</p>
        ) : (
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Student #</th>
                <th className="pb-2 font-medium pr-4">Name</th>
                <th className="pb-2 font-medium pr-4">Email / Phone</th>
                <th className="pb-2 font-medium pr-4">Status</th>
                <th className="pb-2 font-medium pr-4">Current course</th>
                <th className="pb-2 font-medium pr-4 text-center">Enrolments</th>
                <th className="pb-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-surface/50 transition-colors">
                  <td className="py-2.5 pr-4 font-mono text-xs text-gray-400">
                    {s.studentNumber ?? "-"}
                  </td>
                  <td className="py-2.5 pr-4">
                    <p className="font-medium text-primary">{s.name}</p>
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500 text-xs">
                    <p>{s.email ?? "-"}</p>
                    <p>{s.phone ?? "-"}</p>
                  </td>
                  <td className="py-2.5 pr-4">
                    {s.status === "ACTIVE" ? (
                      <span className="badge badge-success text-xs">Active</span>
                    ) : s.status === "SUSPENDED" ? (
                      <span className="badge badge-danger text-xs">Suspended</span>
                    ) : s.status === "PENDING_ACCEPTANCE" ? (
                      <span className="badge badge-info text-xs">Pending acceptance</span>
                    ) : (
                      <span className="badge badge-warning text-xs">Pending</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500 max-w-[160px] truncate">
                    {s.enrolments[0]?.course.title ?? "-"}
                  </td>
                  <td className="py-2.5 pr-4 text-center text-sm">{s._count.enrolments}</td>
                  <td className="py-2.5 text-xs text-gray-400">
                    {new Date(s.createdAt).toLocaleDateString("en-UG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/registrar/students?q=${q}&status=${statusFilter ?? ""}&page=${page - 1}`}
                  className="btn-outline text-xs px-3 py-1.5 no-underline"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/registrar/students?q=${q}&status=${statusFilter ?? ""}&page=${page + 1}`}
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
