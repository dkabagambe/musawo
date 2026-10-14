import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { BarChart2, CheckCircle2, XCircle, Clock } from "lucide-react";

export const metadata = { title: "Gradebook" };

export default async function GradebookPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const grades = await db.gradeEntry.findMany({
    where: { userId: session.user.id },
    include: { course: { select: { title: true, slug: true } } },
    orderBy: [{ course: { title: "asc" } }, { gradedAt: "desc" }],
  });

  const byCourse: Record<string, typeof grades> = {};
  for (const g of grades) {
    if (!byCourse[g.courseId]) byCourse[g.courseId] = [];
    byCourse[g.courseId].push(g);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">My Gradebook</h1>
        <p className="text-gray-500 text-sm mt-1">All assessed work across your courses</p>
      </div>

      {Object.keys(byCourse).length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart2 className="w-7 h-7 text-primary/40" />
          </div>
          <h2 className="font-bold text-primary mb-2">No grades yet</h2>
          <p className="text-gray-500 text-sm">Grades appear here after exams and assignments are marked.</p>
        </div>
      ) : Object.entries(byCourse).map(([courseId, entries]) => {
        const graded = entries.filter((e) => e.percentage != null);
        const avg = graded.length > 0
          ? Math.round(graded.reduce((s, e) => s + (e.percentage ?? 0), 0) / graded.length)
          : null;
        const passing = avg != null && avg >= 50;

        return (
          <section key={courseId} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            {/* Course header with avg */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface/50">
              <h2 className="font-bold text-primary">{entries[0].course.title}</h2>
              {avg != null && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold
                  ${passing ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                  {passing ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  Avg {avg}%
                </div>
              )}
            </div>

            {/* Grades table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-border">
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider">Assessment</th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider hidden sm:table-cell">Type</th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-right">Score</th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-right">%</th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((entry) => {
                    const epct = entry.percentage != null ? Math.round(entry.percentage) : null;
                    return (
                      <tr key={entry.id} className="hover:bg-surface/50 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-primary">{entry.itemTitle}</td>
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            entry.itemType === "EXAM" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                            {entry.itemType}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-gray-600">
                          {entry.score != null && entry.maxScore != null ? `${entry.score}/${entry.maxScore}` : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-primary">
                          {epct != null ? `${epct}%` : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {entry.passed === true  ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-success"><CheckCircle2 className="w-3.5 h-3.5" />Pass</span> :
                           entry.passed === false ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger"><XCircle className="w-3.5 h-3.5" />Fail</span> :
                                                    <span className="inline-flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3.5 h-3.5" />Pending</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
