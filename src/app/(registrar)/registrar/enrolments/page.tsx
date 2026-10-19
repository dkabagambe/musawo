import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";

export const metadata = { title: "Enrolments - Registrar" };

interface Props {
  searchParams: { q?: string; page?: string; status?: string };
}

export default async function RegistrarEnrolmentsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "enrolments.view")) redirect("/dashboard");

  const q = searchParams.q?.trim() ?? "";
  const statusFilter = searchParams.status as string | undefined;
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 25;
  const skip = (page - 1) * take;

  const where = {
    ...(statusFilter ? { status: statusFilter as never } : {}),
    ...(q ? {
      OR: [
        { user: { name: { contains: q, mode: "insensitive" as const } } },
        { user: { email: { contains: q, mode: "insensitive" as const } } },
        { user: { studentNumber: { contains: q, mode: "insensitive" as const } } },
        { course: { title: { contains: q, mode: "insensitive" as const } } },
      ],
    } : {}),
  };

  const [enrolments, total] = await Promise.all([
    db.enrolment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        user:   { select: { name: true, email: true, studentNumber: true } },
        course: { select: { title: true, slug: true } },
      },
    }),
    db.enrolment.count({ where }),
  ]);

  const totalPages = Math.ceil(total / take);

  const STATUS_COLOURS: Record<string, string> = {
    ACTIVE:     "badge-success",
    COMPLETED:  "badge-info",
    SUSPENDED:  "badge-danger",
    SPONSORED:  "badge-warning",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Enrolments</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} total</p>
        </div>
      </div>

      <form method="GET" className="flex flex-wrap gap-3">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search name, email, student #, course..."
          className="input max-w-xs"
        />
        <select name="status" defaultValue={statusFilter ?? ""} className="input w-auto text-sm">
          <option value="">All statuses</option>
          {["ACTIVE","COMPLETED","SUSPENDED"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button type="submit" className="btn-primary text-sm">Search</button>
        {(q || statusFilter) && (
          <a href="/registrar/enrolments" className="btn-ghost text-sm no-underline">Clear</a>
        )}
      </form>

      <div className="card overflow-x-auto">
        {enrolments.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No enrolments found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Student</th>
                <th className="pb-2 font-medium pr-4">Course</th>
                <th className="pb-2 font-medium pr-4 text-right">Total fee</th>
                <th className="pb-2 font-medium pr-4 text-right">Paid</th>
                <th className="pb-2 font-medium pr-4">Status</th>
                <th className="pb-2 font-medium">Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {enrolments.map((e) => (
                <tr key={e.id} className="hover:bg-surface/50 transition-colors">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium text-primary">{e.user.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{e.user.studentNumber ?? e.user.email}</p>
                  </td>
                  <td className="py-2.5 pr-4 text-sm text-gray-600 max-w-[180px] truncate">
                    {e.course.title}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-sm">
                    {e.totalAmountUgx != null ? `UGX ${e.totalAmountUgx.toLocaleString()}` : "-"}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-sm font-medium text-success">
                    {e.paidAmountUgx > 0 ? `UGX ${e.paidAmountUgx.toLocaleString()}` : "-"}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={`badge text-xs ${STATUS_COLOURS[e.status] ?? "badge-neutral"}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-xs text-gray-400">
                    {new Date(e.createdAt).toLocaleDateString("en-UG")}
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
                <Link href={`/registrar/enrolments?q=${q}&status=${statusFilter ?? ""}&page=${page - 1}`} className="btn-outline text-xs px-3 py-1.5 no-underline">
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/registrar/enrolments?q=${q}&status=${statusFilter ?? ""}&page=${page + 1}`} className="btn-primary text-xs px-3 py-1.5 no-underline">
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
