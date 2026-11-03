import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
export const dynamic = "force-dynamic";


export const metadata = { title: "Programmes - Admin" };

export default async function AdminProgrammesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) redirect("/403");

  const courses = await db.course.findMany({
    orderBy: { title: "asc" },
    include: {
      tutor: { select: { name: true } },
      _count: { select: { enrolments: true } },
      intakes: { where: { isOpen: true }, select: { id: true, label: true }, take: 1 },
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
        <h1 className="text-2xl font-bold">Academic Programmes</h1>
        <p className="text-sm text-gray-500 mt-1">
          View-only. Programme changes require Director approval via the Principal.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📚</p>
          <p className="text-gray-500 text-sm">No programmes found.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="font-semibold">{c.title}</h2>
                <span className={`badge text-xs flex-shrink-0 ${STATUS_BADGE[c.status] ?? "badge-info"}`}>
                  {c.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2 line-clamp-2">{c.shortDescription ?? c.description}</p>
              <div className="text-xs text-gray-400 space-y-0.5">
                <p>Tutor: {c.tutor.name}</p>
                <p>{c._count.enrolments} enrolled</p>
                {c.intakes[0] && <p className="text-green-600">Open: {c.intakes[0].label}</p>}
                {c.fullFeeUgx && <p>UGX {c.fullFeeUgx.toLocaleString()}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
