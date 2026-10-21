/**
 * /director/roles - Roles and Permissions page for SUPER_ADMIN.
 *
 * Read-only view of the role tree and capability matrix.
 * Access is gated on settings.view (SUPER_ADMIN always has this).
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import RolesPermissionsView from "@/components/roles/RolesPermissionsView";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Roles and Permissions - MTC",
};

export default async function DirectorRolesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "settings.view")) redirect("/director");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles and Permissions"
        subtitle="Organogram, capability matrix and system access rules"
      />
      <RolesPermissionsView />
    </div>
  );
}
