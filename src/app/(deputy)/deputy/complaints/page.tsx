import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { MessageSquare, Clock } from "lucide-react";

export const metadata = { title: "Complaints - Deputy Principal" };

interface Props { searchParams: { status?: string } }

export default async function DeputyComplaintsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "support.manage")) redirect("/login");

  const statusFilter = searchParams.status;

  const tickets = await db.supportTicket.findMany({
    where: statusFilter ? { status: statusFilter as never } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { name: true, studentNumber: true, role: true } },
    },
  });

  const counts = await db.supportTicket.groupBy({ by: ["status"], _count: true });
  const byStatus: Record<string, number> = {};
  for (const c of counts) byStatus[c.status] = c._count;

  const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
    OPEN:        { label: "Open",        cls: "badge-warning" },
    IN_PROGRESS: { label: "In progress", cls: "badge-info" },
    RESOLVED:    { label: "Resolved",    cls: "badge-success" },
    CLOSED:      { label: "Closed",      cls: "bg-gray-100 text-gray-500" },
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Complaints and Support</h1>
        <p className="text-gray-500 text-sm mt-1">Student and staff support tickets</p>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        <a href="/deputy/complaints" className={`px-4 py-1.5 rounded-full text-sm font-semibold no-underline border transition-colors ${!statusFilter ? "bg-primary text-white border-primary" : "border-border text-gray-500 hover:border-primary hover:text-primary"}`}>
          All ({tickets.length})
        </a>
        {Object.entries(STATUS_LABELS).map(([s, { label }]) => (
          <a key={s} href={`/deputy/complaints?status=${s}`}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold no-underline border transition-colors ${statusFilter === s ? "bg-primary text-white border-primary" : "border-border text-gray-500 hover:border-primary hover:text-primary"}`}>
            {label} ({byStatus[s] ?? 0})
          </a>
        ))}
      </div>

      <div className="card">
        {tickets.length === 0 ? (
          <div className="py-12 text-center">
            <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No support tickets found.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tickets.map((t) => (
              <div key={t.id} className="p-4 hover:bg-surface/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-primary truncate">{t.subject}</p>
                      <span className={`badge text-xs ${STATUS_LABELS[t.status]?.cls ?? "badge-info"}`}>
                        {STATUS_LABELS[t.status]?.label ?? t.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{t.subject}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>{t.user.name}</span>
                      {t.user.studentNumber && <span>{t.user.studentNumber}</span>}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(t.createdAt).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
