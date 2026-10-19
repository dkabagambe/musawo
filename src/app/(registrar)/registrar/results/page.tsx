import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata = { title: "Results - Registrar" };

interface Props {
  searchParams: { q?: string; page?: string };
}

export default async function RegistrarResultsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "grades.view")) redirect("/dashboard");

  const q = searchParams.q?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 25;
  const skip = (page - 1) * take;

  const where = {
    status: "SUBMITTED" as const,
    ...(q ? {
      OR: [
        { user: { name: { contains: q, mode: "insensitive" as const } } },
        { exam: { title: { contains: q, mode: "insensitive" as const } } },
      ],
    } : {}),
  };

  const [attempts, total] = await Promise.all([
    db.examAttempt.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      take,
      skip,
      include: {
        user: { select: { name: true, email: true, studentNumber: true } },
        exam: {
          select: {
            title: true,
            passPercent: true,
            course: { select: { title: true } },
          },
        },
      },
    }),
    db.examAttempt.count({ where }),
  ]);

  const totalPages = Math.ceil(total / take);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Exam Results</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} submitted attempt{total !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <form method="GET" className="flex gap-3">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search student name or exam..."
          className="input max-w-xs"
        />
        <button type="submit" className="btn-primary text-sm">Search</button>
        {q && <a href="/registrar/results" className="btn-ghost text-sm no-underline">Clear</a>}
      </form>

      <div className="card overflow-x-auto">
        {attempts.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No submitted results found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Student</th>
                <th className="pb-2 font-medium pr-4">Exam</th>
                <th className="pb-2 font-medium pr-4">Course</th>
                <th className="pb-2 font-medium pr-4 text-center">Score</th>
                <th className="pb-2 font-medium pr-4 text-center">Pass mark</th>
                <th className="pb-2 font-medium pr-4">Result</th>
                <th className="pb-2 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {attempts.map((a) => {
                const pct = a.maxScore ? Math.round(((a.score ?? 0) / a.maxScore) * 100) : null;
                return (
                  <tr key={a.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-primary">{a.user.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{a.user.studentNumber ?? a.user.email}</p>
                    </td>
                    <td className="py-2.5 pr-4 text-sm">{a.exam.title}</td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500 max-w-[140px] truncate">{a.exam.course.title}</td>
                    <td className="py-2.5 pr-4 text-center text-sm font-medium">
                      {pct !== null ? `${pct}%` : "-"}
                    </td>
                    <td className="py-2.5 pr-4 text-center text-xs text-gray-400">
                      {a.exam.passPercent}%
                    </td>
                    <td className="py-2.5 pr-4">
                      {a.passed === true ? (
                        <span className="badge badge-success text-xs">Pass</span>
                      ) : a.passed === false ? (
                        <span className="badge badge-danger text-xs">Fail</span>
                      ) : (
                        <span className="badge badge-warning text-xs">Marking</span>
                      )}
                    </td>
                    <td className="py-2.5 text-xs text-gray-400">
                      {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString("en-UG") : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <a href={`/registrar/results?q=${q}&page=${page - 1}`} className="btn-outline text-xs px-3 py-1.5 no-underline">Previous</a>
              )}
              {page < totalPages && (
                <a href={`/registrar/results?q=${q}&page=${page + 1}`} className="btn-primary text-xs px-3 py-1.5 no-underline">Next</a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
