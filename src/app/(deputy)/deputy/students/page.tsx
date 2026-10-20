import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";

export const metadata = { title: "Students - Deputy Principal" };

interface Props { searchParams: { q?: string; page?: string } }

export default async function DeputyStudentsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/login");

  const q = searchParams.q?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 25; const skip = (page - 1) * take;

  const where = {
    role: "STUDENT" as const,
    ...(q ? { OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { email: { contains: q, mode: "insensitive" as const } },
      { studentNumber: { contains: q, mode: "insensitive" as const } },
    ] } : {}),
  };

  const [students, total] = await Promise.all([
    db.user.findMany({
      where, orderBy: { createdAt: "desc" }, take, skip,
      select: { id: true, name: true, email: true, studentNumber: true, status: true, createdAt: true,
        enrolments: { select: { status: true, course: { select: { title: true } } }, take: 1, orderBy: { createdAt: "desc" } },
      },
    }),
    db.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / take);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Students</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total.toLocaleString()} total - read-only view</p>
        </div>
      </div>

      <form method="GET" className="flex gap-3">
        <input name="q" type="search" defaultValue={q} placeholder="Search name, email, student number..." className="input max-w-xs" />
        <button type="submit" className="btn-primary text-sm">Search</button>
        {q && <a href="/deputy/students" className="btn-ghost text-sm no-underline">Clear</a>}
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
                <th className="pb-2 font-medium pr-4">Email</th>
                <th className="pb-2 font-medium pr-4">Status</th>
                <th className="pb-2 font-medium">Course</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-surface/50">
                  <td className="py-2.5 pr-4 font-mono text-xs text-gray-400">{s.studentNumber ?? "-"}</td>
                  <td className="py-2.5 pr-4 font-medium text-primary">{s.name}</td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">{s.email ?? "-"}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`badge text-xs ${s.status === "ACTIVE" ? "badge-success" : s.status === "SUSPENDED" ? "badge-danger" : "badge-warning"}`}>
                      {s.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-2.5 text-xs text-gray-500">{s.enrolments[0]?.course.title ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && <Link href={`/deputy/students?q=${q}&page=${page-1}`} className="btn-outline text-xs px-3 py-1.5 no-underline">Previous</Link>}
              {page < totalPages && <Link href={`/deputy/students?q=${q}&page=${page+1}`} className="btn-primary text-xs px-3 py-1.5 no-underline">Next</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
