import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";

export const metadata = { title: "Classes - Admin" };

export default async function AdminClassesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/403");

  const classes = await db.liveClass.findMany({
    orderBy: { scheduledAt: "desc" },
    take: 30,
    include: {
      course: { select: { title: true } },
      tutor:  { select: { name: true } },
      _count: { select: { attendance: true } },
    },
  });

  const STATUS_BADGE: Record<string, string> = {
    SCHEDULED:  "badge-info",
    LIVE:       "badge-warning",
    COMPLETED:  "badge-success",
    CANCELLED:  "badge-danger",
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Classes &amp; Groups</h1>
        <p className="text-sm text-gray-500 mt-1">All live classes across programmes</p>
      </div>

      {classes.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📺</p>
          <p className="text-gray-500 text-sm">No classes scheduled yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold">{c.title}</h2>
                    <span className={`badge text-xs ${STATUS_BADGE[c.status] ?? "badge-info"}`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {c.course.title} &middot; {c.tutor.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(c.scheduledAt).toLocaleString("en-UG")}
                  </p>
                </div>
                {c._count.attendance > 0 && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-primary">{c._count.attendance}</p>
                    <p className="text-xs text-gray-400">attendance</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
