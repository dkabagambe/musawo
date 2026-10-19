import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MAX_SUPER_ADMIN_ACCOUNTS } from "@/lib/rbac";

export const metadata = { title: "Staff Accounts - Director" };

export default async function DirectorStaffPage() {
  const session = await auth();
  if (!session?.user || can(session.user.role, "staff.create.approve") === false) redirect("/login");

  const staff = await db.user.findMany({
    where: { role: { in: ["SUPER_ADMIN","SYSTEM_IT","ACADEMIC_REGISTRAR","FINANCE_OFFICER","INSTRUCTOR","TEACHING_ASSISTANT","HR_SYSTEM_ADMIN","AUDITOR_READONLY","BOARD_MEMBER","DEPUTY_PRINCIPAL","PRINCIPAL"] } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, email: true, phone: true,
      role: true, status: true, totpEnabled: true,
      createdAt: true, lastAccessReviewAt: true,
    },
  });

  const superAdminCount = staff.filter((s) => s.role === "SUPER_ADMIN").length;

  const ROLE_COLORS: Record<string, string> = {
    SUPER_ADMIN: "badge-danger",
    SYSTEM_IT:  "badge-warning",
    REGISTRAR:  "badge-info",
    BURSAR:     "badge-info",
    TUTOR:      "badge-success",
    ADMIN:      "badge-info",
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">Staff Accounts</h1>
        <p className="text-xs text-gray-400">
          SUPER_ADMIN slots: {superAdminCount}/{MAX_SUPER_ADMIN_ACCOUNTS}
        </p>
      </div>

      <div className="card mb-4 bg-warning/5 border-warning/20">
        <p className="text-sm text-amber-800">
          <strong>⚠️ Access control:</strong> Creating, suspending, or changing roles for staff accounts
          requires a formal approval request. SUPERADMIN accounts can only be created via the seed script
          or CLI - never through the UI.
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Name</th>
              <th className="pb-2 font-medium pr-4">Email</th>
              <th className="pb-2 font-medium pr-4">Role</th>
              <th className="pb-2 font-medium pr-4">Status</th>
              <th className="pb-2 font-medium pr-4">2FA</th>
              <th className="pb-2 font-medium pr-4">Last review</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {staff.map((s) => (
              <tr key={s.id}>
                <td className="py-2 pr-4 font-medium">{s.name}</td>
                <td className="py-2 pr-4 text-gray-500">{s.email ?? "-"}</td>
                <td className="py-2 pr-4">
                  <span className={`badge text-xs ${ROLE_COLORS[s.role] ?? "badge-info"}`}>
                    {s.role.replace("_", " ")}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  {s.status === "ACTIVE"
                    ? <span className="badge badge-success text-xs">Active</span>
                    : <span className="badge badge-danger text-xs">{s.status}</span>}
                </td>
                <td className="py-2 pr-4">
                  {s.totpEnabled
                    ? <span className="text-success text-xs font-medium">✅ On</span>
                    : <span className="text-danger text-xs font-medium">❌ Off</span>}
                </td>
                <td className="py-2 pr-4 text-xs text-gray-400">
                  {s.lastAccessReviewAt
                    ? new Date(s.lastAccessReviewAt).toLocaleDateString("en-UG")
                    : "Never"}
                </td>
                <td className="py-2">
                  {/* Suspension requires an approval request, not a direct button */}
                  {s.role !== "SUPER_ADMIN" && s.status === "ACTIVE" && (
                    <a
                      href={`/director/approvals/new?type=STAFF_ACCOUNT_SUSPEND&staffUserId=${s.id}`}
                      className="text-xs text-danger no-underline hover:underline"
                    >
                      Request suspend
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
