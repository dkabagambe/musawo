import { auth } from "@/lib/auth";
import { can, canManageAccountRecoveryTarget } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getAllSettings } from "@/lib/settings";
import { redirect } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import InviteActions from "@/components/ui/InviteActions";

export const metadata = { title: "Pending Invites" };

export default async function PendingInvitesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "invites.resend"))
    redirect("/403");
  const [invites, settings] = await Promise.all([
    db.staffInvite.findMany({
      where: { acceptedAt: null, userId: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        expiresAt: true,
      },
      take: 100,
    }),
    getAllSettings(),
  ]);
  const visibleInvites = invites.filter((invite) =>
    canManageAccountRecoveryTarget(invite.role),
  );
  const labels = Object.fromEntries(
    Object.entries(settings)
      .filter(([key]) => key.startsWith("role.label."))
      .map(([key, value]) => [key.slice("role.label.".length), value]),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending Staff Invites"
        subtitle="Resend or revoke eligible invitations"
      />
      <div className="card overflow-x-auto">
        {visibleInvites.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No pending staff invites.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-gray-500">
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Sent</th>
                <th className="p-3">Expires</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleInvites.map((invite) => (
                <tr key={invite.id}>
                  <td className="p-3">{invite.email}</td>
                  <td className="p-3">{labels[invite.role] ?? invite.role}</td>
                  <td className="p-3 text-gray-500">
                    {new Date(invite.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-gray-500">
                    {new Date(invite.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <InviteActions inviteId={invite.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
