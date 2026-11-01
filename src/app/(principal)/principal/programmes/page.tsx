import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";

export const metadata = { title: "Programmes - Principal" };

export default async function PrincipalProgrammesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) redirect("/403");

  const courses = await db.course.findMany({
    orderBy: { title: "asc" },
    include: {
      tutor: { select: { name: true } },
      enrolments: { select: { id: true } },
      intakes: { where: { isOpen: true }, select: { id: true, label: true } },
    },
  });

  const STATUS_BADGE: Record<string, string> = {
    DRAFT:     "badge-warning",
    PUBLISHED: "badge-success",
    ARCHIVED:  "badge-danger",
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Academic Programmes</h1>
          <p className="text-sm text-gray-500 mt-1">{courses.length} programme{courses.length !== 1 ? "s" : ""}</p>
        </div>
        {can(session.user.role, "courses.edit") && (
          <Link href="/principal/courses" className="btn-primary text-sm no-underline">
            Manage Courses
          </Link>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📚</p>
          <p className="text-gray-500 text-sm">No programmes configured yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="font-semibold text-base">{c.title}</h2>
                  {c.courseCode && (
                    <span className="font-mono text-xs text-gray-400">{c.courseCode}</span>
                  )}
                </div>
                <span className={`badge text-xs flex-shrink-0 ${STATUS_BADGE[c.status] ?? "badge-info"}`}>
                  {c.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 line-clamp-2 mb-3">{c.shortDescription ?? c.description}</p>
              <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                <span>Tutor: {c.tutor.name}</span>
                <span>{c.enrolments.length} enrolled</span>
                {c.durationMonths && <span>{c.durationMonths} months</span>}
                {c.intakes.length > 0 && (
                  <span className="text-green-600">Open intake: {c.intakes[0].label ?? "Current"}</span>
                )}
              </div>
              {c.fullFeeUgx && (
                <p className="text-xs text-primary font-medium mt-2">
                  UGX {c.fullFeeUgx.toLocaleString()}
                  {c.internationalFeeUgx ? ` / USD ${Math.round(c.internationalFeeUgx / 3600).toLocaleString()}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-6">
        Changes to programmes require Director approval. Submit via{" "}
        <Link href="/principal/approval-tracking" className="underline">Approval Tracking</Link>.
      </p>
    </div>
  );
}
