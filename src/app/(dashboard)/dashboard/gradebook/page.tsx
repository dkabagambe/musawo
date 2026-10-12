import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const metadata = { title: "Gradebook" };

export default async function GradebookPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const grades = await db.gradeEntry.findMany({
    where: { userId: session.user.id },
    include: { course: { select: { title: true, slug: true } } },
    orderBy: [{ course: { title: "asc" } }, { gradedAt: "desc" }],
  });

  // Group by course
  const byCourse: Record<string, typeof grades> = {};
  for (const g of grades) {
    const key = g.courseId;
    if (!byCourse[key]) byCourse[key] = [];
    byCourse[key].push(g);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl mb-6">My Gradebook</h1>

      {Object.keys(byCourse).length === 0 && (
        <div className="card text-center py-10">
          <p className="text-4xl mb-3" aria-hidden="true">📊</p>
          <p className="text-gray-500 text-sm">
            No grades yet. Grades appear here after exams and assignments are marked.
          </p>
        </div>
      )}

      {Object.entries(byCourse).map(([courseId, entries]) => {
        const first = entries[0];
        const avg = entries.filter((e) => e.percentage != null).reduce((s, e) => s + (e.percentage ?? 0), 0) /
          (entries.filter((e) => e.percentage != null).length || 1);

        return (
          <div key={courseId} className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">{first.course.title}</h2>
              <span className={`badge text-sm font-bold ${avg >= 50 ? "badge-success" : "badge-danger"}`}>
                Avg: {Math.round(avg)}%
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="text-left text-gray-400 text-xs border-b border-border">
                    <th className="pb-2 font-medium">Item</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium text-right">Score</th>
                    <th className="pb-2 font-medium text-right">%</th>
                    <th className="pb-2 font-medium text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-2 pr-2">{entry.itemTitle}</td>
                      <td className="py-2">
                        <span className={`badge text-xs ${entry.itemType === "EXAM" ? "badge-info" : "badge-warning"}`}>
                          {entry.itemType}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        {entry.score != null && entry.maxScore != null
                          ? `${entry.score}/${entry.maxScore}`
                          : "—"}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {entry.percentage != null ? `${Math.round(entry.percentage)}%` : "—"}
                      </td>
                      <td className="py-2 text-right">
                        {entry.passed === true ? (
                          <span className="badge-success badge">Pass</span>
                        ) : entry.passed === false ? (
                          <span className="badge-danger badge">Fail</span>
                        ) : (
                          <span className="badge-warning badge">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
