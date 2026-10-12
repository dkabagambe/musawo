import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const metadata = { title: "Full Audit Log — Director" };

interface Props { searchParams: { action?: string; page?: string } }

export default async function DirectorAuditPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPERADMIN") redirect("/login");

  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 50;
  const skip = (page - 1) * take;

  const where = searchParams.action ? { action: searchParams.action as never } : {};

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

  const SENSITIVE = new Set([
    "PAYMENT_CONFIRMED","PAYMENT_REFUNDED","CERTIFICATE_REVOKED",
    "ROLE_CHANGED","ACCOUNT_SUSPENDED","BREAK_GLASS_GRANTED","BULK_EXPORT",
    "APPROVAL_APPROVED","APPROVAL_REJECTED",
  ]);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl mb-6">Full Audit Log</h1>

      <form method="GET" className="mb-6 flex gap-3 flex-wrap">
        <input name="action" type="text" defaultValue={searchParams.action ?? ""} placeholder="Filter by action…" className="input max-w-xs text-sm" />
        <button type="submit" className="btn-primary text-sm">Filter</button>
        {searchParams.action && <a href="/director/audit" className="btn-ghost text-sm no-underline">Clear</a>}
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
              <th className="pb-2 font-medium pr-3">IP</th>
              <th className="pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log) => (
              <tr key={log.id} className={SENSITIVE.has(log.action) ? "bg-warning/5" : ""}>
                <td className="py-2 pr-3">
                  <span className={`badge text-xs ${SENSITIVE.has(log.action) ? "badge-warning" : "badge-info"}`}>
                    {log.action.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="py-2 pr-3 font-medium">{log.actor?.name ?? "System"}</td>
                <td className="py-2 pr-3 text-xs text-gray-500">{log.actor?.role?.replace("_"," ") ?? "—"}</td>
                <td className="py-2 pr-3 text-xs text-gray-400 font-mono">
                  {log.entityType ? `${log.entityType} ${(log.entityId ?? "").slice(0, 8)}` : "—"}
                </td>
                <td className="py-2 pr-3 text-xs text-gray-400 font-mono">{log.ip ?? "—"}</td>
                <td className="py-2 text-xs text-gray-400">{new Date(log.createdAt).toLocaleString("en-UG")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && <a href={`/director/audit?page=${page - 1}`} className="btn-outline text-xs px-3 py-1.5 no-underline">Previous</a>}
              {page < totalPages && <a href={`/director/audit?page=${page + 1}`} className="btn-primary text-xs px-3 py-1.5 no-underline">Next</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
