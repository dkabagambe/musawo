import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";

export const metadata = { title: "Classes - Principal" };

interface Props {
  searchParams: { status?: string };
}

export default async function PrincipalClassesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/403");

  const statusFilter = searchParams.status ?? "ALL";

  const where: Record<string, unknown> = {};
  if (statusFilter !== "ALL") where.status = statusFilter;

  const classes = await db.liveClass.findMany({
    where,
    orderBy: { scheduledAt: "desc" },
    take: 50,
    include: {
      course: { select: { title: true } },
      tutor:  { select: { name: true } },
      attendance: { select: { id: true } },
    },
  });

  const STATUS_BADGE: Record<string, string> = {
    SCHEDULED:  "badge-info",
    LIVE:       "badge-warning",
    COMPLETED:  "badge-success",
    CANCELLED:  "badge-danger",
  };

  const TABS = [
    { value: "ALL",       label: "All" },
    { value: "LIVE",      label: "Live Now" },
    { value: "SCHEDULED", label: "Upcoming" },
    { value: "COMPLETED", label: "Past" },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Classes &amp; Groups</h1>
        <p className="text-sm text-gray-500 mt-1">All live classes across programmes</p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border pb-2 flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/principal/classes?status=${t.value}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium no-underline transition-colors ${
              statusFilter === t.value
                ? "bg-primary text-white"
                : "text-gray-500 hover:bg-surface"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {classes.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📺</p>
          <p className="text-gray-500 text-sm">No classes found.</p>
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
                    {c.course.title} &middot; Instructor: {c.tutor.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(c.scheduledAt).toLocaleString("en-UG")}
                    {" "}&middot; {c.durationMin} min
                  </p>
                  {c.joinUrl && (
                    <a
                      href={c.joinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent underline mt-0.5 inline-block"
                    >
                      Google Meet link
                    </a>
                  )}
                </div>
                {c.attendance.length > 0 && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-primary">{c.attendance.length}</p>
                    <p className="text-xs text-gray-400">attended</p>
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
