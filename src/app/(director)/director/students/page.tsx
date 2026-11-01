import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "Students - Director" };

interface Props { searchParams: { q?: string; course?: string; page?: string } }

export default async function DirectorStudentsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/login");

  const q = searchParams.q?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 40;
  const skip = (page - 1) * take;

  const where = {
    role: "STUDENT" as const,
    ...(q ? {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { email: { contains: q, mode: "insensitive" as const } },
        { studentNumber: { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [students, total, activeCount, completedCount] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { name: "asc" },
      take,
      skip,
      select: {
        id: true, name: true, email: true, studentNumber: true, status: true, createdAt: true,
        enrolments: {
          select: { status: true, course: { select: { title: true } } },
          take: 1,
        },
      },
    }),
    db.user.count({ where }),
    db.enrolment.count({ where: { status: "ACTIVE" } }),
    db.enrolment.count({ where: { status: "COMPLETED" } }),
  ]);

  const totalPages = Math.ceil(total / take);

  const STATUS_STYLE: Record<string, string> = {
    ACTIVE: "badge-success",
    INACTIVE: "badge-danger",
    SUSPENDED: "badge-danger",
    PENDING: "badge-warning",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Students</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {total.toLocaleString()} registered &middot; {activeCount.toLocaleString()} active enrolments &middot; {completedCount.toLocaleString()} completed
        </p>
      </div>

      <form method="GET" className="flex gap-3 flex-wrap">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, email or student number..."
          className="input max-w-sm text-sm"
        />
        <button type="submit" className="btn-secondary text-sm">Search</button>
        {q && <Link href="/director/students" className="btn-ghost text-sm no-underline">Clear</Link>}
      </form>

      <div className="card overflow-x-auto">
        <p className="text-xs text-gray-400 mb-3">{total.toLocaleString()} student{total !== 1 ? "s" : ""}{q ? ` matching "${q}"` : ""}</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Name</th>
              <th className="pb-2 font-medium pr-4">Student No.</th>
              <th className="pb-2 font-medium pr-4">Email</th>
              <th className="pb-2 font-medium pr-4">Programme</th>
              <th className="pb-2 font-medium pr-4">Status</th>
              <th className="pb-2 font-medium">Registered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.map((s) => (
              <tr key={s.id} className="hover:bg-surface/40">
                <td className="py-2.5 pr-4 font-medium">{s.name}</td>
                <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">{s.studentNumber ?? "-"}</td>
                <td className="py-2.5 pr-4 text-gray-500 text-xs">{s.email ?? "-"}</td>
                <td className="py-2.5 pr-4 text-xs text-gray-500">
                  {s.enrolments[0]?.course.title ?? "-"}
                </td>
                <td className="py-2.5 pr-4">
                  <span className={`badge text-xs ${STATUS_STYLE[s.status] ?? "badge-info"}`}>
                    {s.status}
                  </span>
                </td>
                <td className="py-2.5 text-xs text-gray-400">
                  {new Date(s.createdAt).toLocaleDateString("en-UG")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {students.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">No students found.</p>
        )}

        {totalPages > 1 && (
          <div className="flex justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/director/students?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="btn-outline text-xs px-3 py-1.5 no-underline">
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/director/students?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="btn-primary text-xs px-3 py-1.5 no-underline">
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
