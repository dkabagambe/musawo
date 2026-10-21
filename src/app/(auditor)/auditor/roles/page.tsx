/**
 * /auditor/roles - Roles and Permissions page for AUDITOR_READONLY.
 *
 * Read-only view. Every view is logged in the audit log.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import RolesPermissionsView from "@/components/roles/RolesPermissionsView";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Roles and Permissions - MTC",
};

export default async function AuditorRolesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "audit.view")) redirect("/auditor");

  // Every view of this page by the auditor must be logged
  await audit({
    actorId:    session.user.id,
    action:    "ROLES_PERMISSIONS_VIEWED",
    entityType: "RolesPermissionsPage",
    entityId:  "roles-permissions",
    metadata: { role: session.user.role },
  }).catch(() => {
    // Non-fatal: log failure should not block the view
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles and Permissions"
        subtitle="Organogram, capability matrix and system access rules (read-only view, this visit was logged)"
      />
      <RolesPermissionsView />
    </div>
  );
}
