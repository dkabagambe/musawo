import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
export const dynamic = "force-dynamic";

export const metadata = { title: "Academic Programmes - Registrar" };

export default async function RegistrarProgrammesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) redirect("/registrar");

  const programmes = await db.course.findMany({
    orderBy: { title: "asc" },
    include: {
      tutor: { select: { name: true } },
      _count: { select: { enrolments: true } },
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Academic Programmes</h1>
        <p className="text-sm text-gray-500 mt-1">
          {programmes.length} programme{programmes.length !== 1 ? "s" : ""} — read-only view
        </p>
      </div>

      {programmes.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📚</p>
          <p className="text-gray-500 text-sm">No programmes configured yet.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Programme</th>
                <th className="pb-2 font-medium pr-4">Code</th>
                <th className="pb-2 font-medium pr-4">Lead Instructor</th>
                <th className="pb-2 font-medium pr-4">Status</th>
                <th className="pb-2 font-medium pr-4 text-center">Enrolled</th>
                <th className="pb-2 font-medium pr-4">Duration</th>
                <th className="pb-2 font-medium">Open Intake</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {programmes.map((p) => (
                <tr key={p.id} className="hover:bg-surface/50 transition-colors">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium text-primary">{p.title}</p>
                    <p className="text-xs text-gray-400">/{p.slug}</p>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">
                    {p.courseCode ?? "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-sm text-gray-600">{p.tutor.name}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`badge text-xs ${STATUS_BADGE[p.status] ?? "badge-neutral"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-center text-sm">{p._count.enrolments}</td>
                  <td className="py-2.5 pr-4 text-xs text-gray-400">
                    {p.durationMonths ? `${p.durationMonths} mo.` : "—"}
                  </td>
                  <td className="py-2.5 text-xs text-gray-400">
                    {p.intakes.length > 0
                      ? <span className="text-green-600 font-medium">{p.intakes[0].label ?? "Open"}</span>
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
