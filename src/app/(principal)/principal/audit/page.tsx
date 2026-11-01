import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata = { title: "Audit Log - Principal" };

interface Props {
  searchParams: { page?: string; action?: string };
}

export default async function PrincipalAuditPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "audit.view")) redirect("/403");

  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 30;
  const skip = (page - 1) * take;
  const actionFilter = searchParams.action ?? "";

  const where: Record<string, unknown> = {};
  if (actionFilter) where.action = { contains: actionFilter, mode: "insensitive" };

  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        actor: { select: { name: true, role: true } },
      },
    }),
    db.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / take);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">
          System activity log. {total.toLocaleString()} entries total.
        </p>
      </div>

      <form method="GET" className="flex gap-3 mb-6">
        <input
          name="action"
          type="search"
          defaultValue={actionFilter}
          placeholder="Filter by action (e.g. APPROVAL)..."
          className="input max-w-xs"
        />
        <button type="submit" className="btn-primary text-sm">Filter</button>
        {actionFilter && <a href="/principal/audit" className="btn-ghost text-sm no-underline">Clear</a>}
      </form>

      <div className="card overflow-x-auto">
        {entries.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No audit entries found.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Time</th>
                <th className="pb-2 font-medium pr-4">Actor</th>
                <th className="pb-2 font-medium pr-4">Action</th>
                <th className="pb-2 font-medium pr-4">Entity</th>
                <th className="pb-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-surface/40">
                  <td className="py-2 pr-4 text-gray-400 whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString("en-UG")}
                  </td>
                  <td className="py-2 pr-4">
                    <p className="font-medium">{e.actor?.name ?? "System"}</p>
                    {e.actor?.role && (
                      <p className="text-gray-400">{e.actor.role.replace(/_/g, " ")}</p>
                    )}
                  </td>
                  <td className="py-2 pr-4 font-mono">{e.action}</td>
                  <td className="py-2 pr-4 text-gray-500">
                    {e.entityType}
                    {e.entityId && (
                      <span className="text-gray-300 font-mono block text-xs">
                        {e.entityId.slice(0, 8)}...
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-gray-500 max-w-xs truncate">
                    {e.metadata ? JSON.stringify(e.metadata) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <a href={`/principal/audit?page=${page - 1}&action=${actionFilter}`} className="btn-outline text-xs px-3 py-1.5 no-underline">Previous</a>
              )}
              {page < totalPages && (
                <a href={`/principal/audit?page=${page + 1}&action=${actionFilter}`} className="btn-primary text-xs px-3 py-1.5 no-underline">Next</a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
