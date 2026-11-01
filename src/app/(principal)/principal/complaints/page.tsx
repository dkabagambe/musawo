import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "Support Tickets - Principal" };

interface Props { searchParams: { status?: string } }

export default async function PrincipalComplaintsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "support.view")) redirect("/login");

  const statusFilter = searchParams.status;
  const where = statusFilter ? { status: statusFilter as never } : {};

  const [tickets, openCount] = await Promise.all([
    db.supportTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        user: { select: { name: true, role: true } },
        _count: { select: { replies: true } },
      },
    }),
    db.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
  ]);

  const STATUS_STYLE: Record<string, string> = {
    OPEN: "badge-warning",
    IN_PROGRESS: "badge-info",
    RESOLVED: "badge-success",
    CLOSED: "badge",
  };

  const STATUSES = [
    { label: `Open (${openCount})`, value: "" },
    { label: "In progress",         value: "IN_PROGRESS" },
    { label: "Resolved",            value: "RESOLVED" },
    { label: "All",                 value: "ALL" },
  ];

  const filtered = statusFilter === "ALL" ? tickets : tickets;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Support Tickets</h1>
        <p className="text-sm text-gray-500 mt-0.5">{openCount} open ticket{openCount !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex gap-2 flex-wrap border-b border-border pb-2">
        {STATUSES.map((s) => (
          <Link
            key={s.value}
            href={`/principal/complaints${s.value ? `?status=${s.value}` : ""}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium no-underline transition-colors ${
              (statusFilter ?? "") === s.value
                ? "bg-primary text-white"
                : "text-gray-500 hover:bg-surface"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-3xl mb-3">✅</p>
          <p className="text-gray-500 text-sm">No tickets matching this filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <Link
              key={t.id}
              href={`/principal/support`}
              className="card flex items-start gap-4 hover:shadow-md transition-shadow no-underline block"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm text-primary">{t.subject}</span>
                  <span className={`badge text-xs ${STATUS_STYLE[t.status] ?? "badge"}`}>
                    {t.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {t.user.name} ({t.user.role.replace("_", " ")}) &middot; {t._count.replies} repl{t._count.replies !== 1 ? "ies" : "y"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(t.createdAt).toLocaleDateString("en-UG")}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
