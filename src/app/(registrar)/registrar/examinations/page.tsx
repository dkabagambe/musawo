import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
export const dynamic = "force-dynamic";

export const metadata = { title: "Examinations - Registrar" };

interface Props {
  searchParams: { q?: string };
}

export default async function RegistrarExaminationsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "grades.view")) redirect("/registrar");

  const q = searchParams.q?.trim() ?? "";

  const [exams, totalAttempts, passedAttempts] = await Promise.all([
    db.exam.findMany({
      where: q ? { title: { contains: q, mode: "insensitive" } } : {},
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        course: { select: { title: true, courseCode: true } },
        _count: { select: { attempts: true } },
      },
    }),
    db.examAttempt.count({ where: { status: "SUBMITTED" } }),
    db.examAttempt.count({ where: { status: "SUBMITTED", passed: true } }),
  ]);

  const passRate = totalAttempts > 0
    ? Math.round((passedAttempts / totalAttempts) * 100)
    : null;

  const STATUS_BADGE: Record<string, string> = {
    PUBLISHED: "badge-success",
    DRAFT:     "badge-warning",
    ARCHIVED:  "badge-danger",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Examinations</h1>
        <p className="text-sm text-gray-500 mt-0.5">All examinations — read-only</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total exams", value: exams.length },
          { label: "Total submissions", value: totalAttempts },
          { label: "Passed", value: passedAttempts },
          { label: "Pass rate", value: passRate !== null ? `${passRate}%` : "N/A" },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <p className="text-2xl font-bold text-primary">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <form method="GET" className="flex gap-3">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search exam title..."
          className="input max-w-xs"
        />
        <button type="submit" className="btn-primary text-sm">Search</button>
        {q && <a href="/registrar/examinations" className="btn-ghost text-sm no-underline">Clear</a>}
      </form>

      <div className="card overflow-x-auto">
        {exams.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No exams found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Exam</th>
                <th className="pb-2 font-medium pr-4">Course</th>
                <th className="pb-2 font-medium pr-4 text-center">Submissions</th>
                <th className="pb-2 font-medium pr-4 text-center">Pass %</th>
                <th className="pb-2 font-medium pr-4 text-center">Time limit</th>
                <th className="pb-2 font-medium pr-4">Status</th>
                <th className="pb-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {exams.map((e) => (
                <tr key={e.id} className="hover:bg-surface/50 transition-colors">
                  <td className="py-2.5 pr-4 font-medium">{e.title}</td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">
                    {e.course.title}
                    {e.course.courseCode && (
                      <span className="ml-1 font-mono text-gray-400">({e.course.courseCode})</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-center">{e._count.attempts}</td>
                  <td className="py-2.5 pr-4 text-center font-semibold">{e.passPercent}%</td>
                  <td className="py-2.5 pr-4 text-center text-xs text-gray-400">
                    {e.timeLimitMin ? `${e.timeLimitMin} min` : "None"}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={`badge text-xs ${STATUS_BADGE[e.status] ?? "badge-info"}`}>
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
      </div>
    </div>
  );
}
