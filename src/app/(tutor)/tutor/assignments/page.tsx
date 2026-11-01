import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { can } from "@/lib/rbac";
import { ClipboardList } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Assignments - Teaching Portal" };

export default async function TutorAssignmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "content.upload")) redirect("/403");

  const assignments = await db.assignment.findMany({
    where: { course: teachingCourseWhere(session.user.id) },
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { title: true } },
      _count: { select: { submissions: true } },
      submissions: {
        where: { status: "SUBMITTED", grade: null },
        select: { id: true },
      },
    },
  });

  const pendingGrading = assignments.reduce((s, a) => s + a.submissions.length, 0);

  const STATUS_STYLE: Record<string, string> = {
    PUBLISHED: "badge-success",
    DRAFT: "badge-warning",
    CLOSED: "badge",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Assignments</h1>
        <p className="text-sm text-gray-500 mt-1">
          {pendingGrading > 0
            ? `${pendingGrading} submission${pendingGrading !== 1 ? "s" : ""} awaiting grading`
            : "All submissions graded"}
        </p>
      </div>

      {assignments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-7 h-7 text-primary/40" />
          </div>
          <p className="text-gray-500 text-sm">No assignments for your courses yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <div
              key={a.id}
              className={`card ${a.submissions.length > 0 ? "border-warning/40" : ""}`}
            >
              {a.submissions.length > 0 && <div className="h-1 bg-warning rounded-t-xl -mt-6 -mx-6 mb-4" />}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="font-semibold text-primary">{a.title}</h2>
                    <span className={`badge text-xs ${STATUS_STYLE[a.status] ?? "badge-info"}`}>{a.status}</span>
                    {a.submissions.length > 0 && (
                      <span className="badge badge-warning text-xs">
                        {a.submissions.length} to grade
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{a.course.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {a._count.submissions} submission{a._count.submissions !== 1 ? "s" : ""} total
                    {a.dueDate ? ` · Due ${new Date(a.dueDate).toLocaleDateString("en-UG")}` : ""}
                    {" "}&middot; Max {a.maxPoints} pts
                  </p>
                </div>
                <p className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString("en-UG")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
