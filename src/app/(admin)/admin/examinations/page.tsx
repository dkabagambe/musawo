import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
export const dynamic = "force-dynamic";


export const metadata = { title: "Examinations - Admin" };

export default async function AdminExaminationsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "exams.mark")) redirect("/403");

  const exams = await db.exam.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      course: { select: { title: true } },
      _count: { select: { attempts: true, questions: true } },
    },
  });

  const STATUS_BADGE: Record<string, string> = {
    DRAFT:     "badge-warning",
    PUBLISHED: "badge-success",
    ARCHIVED:  "badge-danger",
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Examinations</h1>
        <p className="text-sm text-gray-500 mt-1">
          All exams across programmes. Results are processed in{" "}
          <a href="/admin/results" className="text-accent underline">Results &amp; Grading</a>.
        </p>
      </div>

      {exams.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📝</p>
          <p className="text-gray-500 text-sm">No exams created yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((e) => (
            <div key={e.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold">{e.title}</h2>
                    <span className={`badge text-xs ${STATUS_BADGE[e.status] ?? "badge-info"}`}>
                      {e.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{e.course.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Pass mark: {e.passPercent}% &middot;{" "}
                    {e._count.questions} questions &middot;{" "}
                    {e._count.attempts} attempts
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
