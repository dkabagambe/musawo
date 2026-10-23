import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata = { title: "System Logs - System IT" };

interface Props { searchParams: { page?: string } }

export default async function SystemAuditPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "integrations.edit") && !can(session.user.role, "audit.view")) redirect("/login");

  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 50;
  const skip = (page - 1) * take;

  // SYSTEM_IT sees only infrastructure/settings events - no student or payment data
  const where = {
    action: {
      in: [
        "SETTINGS_CHANGED","LOGIN","LOGOUT",
        "TOTP_ENABLED","TOTP_DISABLED",
        "BREAK_GLASS_GRANTED","BREAK_GLASS_EXPIRED",
        "ACCESS_REVIEW_COMPLETED",
      ] as never[],
    },
  };

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
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl mb-6">System Logs</h1>
      <p className="text-xs text-gray-400 mb-4">
        Showing infrastructure and settings events only. Student and payment data is not accessible to this role.
      </p>

      <div className="card overflow-x-auto">
        <p className="text-sm text-gray-500 mb-3">{total.toLocaleString()} entries</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-3">Action</th>
              <th className="pb-2 font-medium pr-3">Actor</th>
              <th className="pb-2 font-medium pr-3">IP</th>
              <th className="pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="py-2 pr-3">
                  <span className="badge badge-info text-xs">{log.action.replace(/_/g, " ")}</span>
                </td>
                <td className="py-2 pr-3">{log.actor?.name ?? "System"}</td>
                <td className="py-2 pr-3 font-mono text-xs text-gray-400">{log.ip ?? "-"}</td>
                <td className="py-2 text-xs text-gray-400">{new Date(log.createdAt).toLocaleString("en-UG")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && <a href={`/system/audit?page=${page - 1}`} className="btn-outline text-xs px-3 py-1.5 no-underline">Previous</a>}
              {page < totalPages && <a href={`/system/audit?page=${page + 1}`} className="btn-primary text-xs px-3 py-1.5 no-underline">Next</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
