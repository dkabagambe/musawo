import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata = { title: "Audit Log - Admin" };

interface Props {
  searchParams: { action?: string; page?: string };
}

export default async function AdminAuditPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "audit.view")) redirect("/403");

  const actionFilter = searchParams.action ?? "";
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 50;
  const skip = (page - 1) * take;

  const where = actionFilter ? { action: actionFilter as never } : {};

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

  const ACTION_OPTIONS = [
    "CREATE",
    "UPDATE",
    "DELETE",
    "LOGIN",
    "LOGOUT",
    "PAYMENT_INITIATED",
    "PAYMENT_CONFIRMED",
    "PAYMENT_REFUNDED",
    "CERTIFICATE_ISSUED",
    "CERTIFICATE_REVOKED",
    "ENROLMENT_CREATED",
    "EXAM_STARTED",
    "EXAM_SUBMITTED",
    "SETTINGS_CHANGED",
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl mb-6">Audit Log</h1>

      <form method="GET" className="mb-6 flex gap-3 flex-wrap">
        <select
          name="action"
          defaultValue={actionFilter}
          className="input w-auto"
        >
          <option value="">All actions</option>
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {a.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary text-sm">
          Filter
        </button>
        {actionFilter && (
          <a href="/admin/audit" className="btn-ghost text-sm no-underline">
            Clear
          </a>
        )}
      </form>

      <div className="card overflow-x-auto">
        <p className="text-sm text-gray-500 mb-3">
          {total.toLocaleString()} entries
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Action</th>
              <th className="pb-2 font-medium pr-4">Actor</th>
              <th className="pb-2 font-medium pr-4">Entity</th>
              <th className="pb-2 font-medium pr-4">IP</th>
              <th className="pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="py-2 pr-4">
                  <span className="badge badge-info text-xs">
                    {log.action.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="py-2 pr-4 text-gray-700">
                  {log.actor?.name ?? (
                    <span className="text-gray-400">System</span>
                  )}
                </td>
                <td className="py-2 pr-4 text-gray-500 text-xs">
                  {log.entityType
                    ? `${log.entityType} ${log.entityId?.slice(0, 8) ?? ""}`
                    : "-"}
                </td>
                <td className="py-2 pr-4 text-gray-400 text-xs font-mono">
                  {log.ip ?? "-"}
                </td>
                <td className="py-2 text-gray-400 text-xs">
                  {new Date(log.createdAt).toLocaleString("en-UG")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <a
                  href={`/admin/audit?action=${actionFilter}&page=${page - 1}`}
                  className="btn-outline text-xs px-3 py-1.5 no-underline"
                >
                  Previous
                </a>
              )}
              {page < totalPages && (
                <a
                  href={`/admin/audit?action=${actionFilter}&page=${page + 1}`}
                  className="btn-primary text-xs px-3 py-1.5 no-underline"
                >
                  Next
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
