import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import Link from "next/link";

export const metadata = { title: "Audit Log - Auditor" };

interface Props { searchParams: { q?: string; action?: string; page?: string } }

export default async function AuditorAuditPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "audit.view")) redirect("/login");

  await audit({ actorId: session.user.id, action: "LOGIN", entityType: "AuditorAuditView", entityId: "list", metadata: { event: "auditor_audit_view" } });

  const q = searchParams.q?.trim() ?? "";
  const actionFilter = searchParams.action ?? "";
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 50; const skip = (page - 1) * take;

  const where = {
    ...(actionFilter ? { action: actionFilter as never } : {}),
    ...(q ? { OR: [
      { entityType: { contains: q, mode: "insensitive" as const } },
      { actor: { name: { contains: q, mode: "insensitive" as const } } },
    ]} : {}),
  };

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where, orderBy: { createdAt: "desc" }, take, skip,
      include: { actor: { select: { name: true, role: true } } },
    }),
    db.auditLog.count({ where }),
  ]);

  const actions = await db.auditLog.groupBy({ by: ["action"], _count: true, orderBy: { _count: { action: "desc" } }, take: 20 });
  const totalPages = Math.ceil(total / take);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Audit Log</h1>
        <p className="text-gray-500 text-sm mt-0.5">Read-only. All views are logged. {total.toLocaleString()} total events.</p>
      </div>

      <form method="GET" className="flex flex-wrap gap-3">
        <input name="q" type="search" defaultValue={q} placeholder="Search actor or entity..." className="input max-w-xs" />
        <select name="action" defaultValue={actionFilter} className="input w-auto text-sm">
          <option value="">All actions</option>
          {actions.map((a) => <option key={a.action} value={a.action}>{a.action} ({a._count})</option>)}
        </select>
        <button type="submit" className="btn-primary text-sm">Filter</button>
        {(q || actionFilter) && <a href="/auditor/audit" className="btn-ghost text-sm no-underline">Clear</a>}
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Time</th>
              <th className="pb-2 font-medium pr-4">Actor</th>
              <th className="pb-2 font-medium pr-4">Action</th>
              <th className="pb-2 font-medium pr-4">Entity</th>
              <th className="pb-2 font-medium">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-surface/50">
                <td className="py-2 pr-4 text-xs text-gray-400 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString("en-UG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="py-2 pr-4">
                  <p className="font-medium text-primary text-xs">{log.actor?.name ?? "System"}</p>
                  <p className="text-xs text-gray-400">{log.actor?.role?.replace(/_/g, " ") ?? ""}</p>
                </td>
                <td className="py-2 pr-4">
                  <span className="text-xs font-mono bg-surface px-2 py-0.5 rounded text-gray-600">{log.action}</span>
                </td>
                <td className="py-2 pr-4 text-xs text-gray-500">{log.entityType} <span className="text-gray-300">{log.entityId?.substring(0, 8)}</span></td>
                <td className="py-2 text-xs text-gray-400">{log.ip ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && <Link href={`/auditor/audit?q=${q}&action=${actionFilter}&page=${page-1}`} className="btn-outline text-xs px-3 py-1.5 no-underline">Previous</Link>}
              {page < totalPages && <Link href={`/auditor/audit?q=${q}&action=${actionFilter}&page=${page+1}`} className="btn-primary text-xs px-3 py-1.5 no-underline">Next</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
