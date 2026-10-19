import { auth } from "@/lib/auth";
import { can, auditLogFilterForRole } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const metadata = { title: "Audit Log - Registrar" };

interface Props { searchParams: { action?: string; page?: string } }

export default async function RegistrarAuditPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "audit.view")) redirect("/dashboard");

  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 50;
  const skip = (page - 1) * take;

  const roleFilter = auditLogFilterForRole(session.user.role) ?? {};
  const actionFilter = searchParams.action ? { action: searchParams.action as never } : {};
  const where = { ...roleFilter, ...actionFilter };

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: { actor: { select: { name: true, role: true } } },
    }),
    db.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / take);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-0.5">Academic and student record actions</p>
      </div>

      <form method="GET" className="flex gap-3 flex-wrap">
        <input
          name="action"
          type="text"
          defaultValue={searchParams.action ?? ""}
          placeholder="Filter by action..."
          className="input max-w-xs text-sm"
        />
        <button type="submit" className="btn-primary text-sm">Filter</button>
        {searchParams.action && (
          <a href="/registrar/audit" className="btn-ghost text-sm no-underline">Clear</a>
        )}
      </form>

      <div className="card overflow-x-auto">
        <p className="text-sm text-gray-500 mb-3">{total.toLocaleString()} entries</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-3">Action</th>
              <th className="pb-2 font-medium pr-3">Actor</th>
              <th className="pb-2 font-medium pr-3">Role</th>
              <th className="pb-2 font-medium pr-3">Entity</th>
              <th className="pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-surface/50 transition-colors">
                <td className="py-2 pr-3 font-mono text-xs">{log.action}</td>
                <td className="py-2 pr-3 text-sm">{log.actor?.name ?? "System"}</td>
                <td className="py-2 pr-3 text-xs text-gray-400">{log.actor?.role ?? "-"}</td>
                <td className="py-2 pr-3 text-xs text-gray-500">
                  {log.entityType ? `${log.entityType} / ${log.entityId?.slice(0, 8)}...` : "-"}
                </td>
                <td className="py-2 text-xs text-gray-400">
                  {new Date(log.createdAt).toLocaleDateString("en-UG")}{" "}
                  {new Date(log.createdAt).toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <a href={`/registrar/audit?action=${searchParams.action ?? ""}&page=${page - 1}`} className="btn-outline text-xs px-3 py-1.5 no-underline">Previous</a>
              )}
              {page < totalPages && (
                <a href={`/registrar/audit?action=${searchParams.action ?? ""}&page=${page + 1}`} className="btn-primary text-xs px-3 py-1.5 no-underline">Next</a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
