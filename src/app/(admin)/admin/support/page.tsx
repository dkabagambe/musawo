/**
 * /admin/support
 *
 * Support ticket management for HR_SYSTEM_ADMIN.
 * HR manages support tickets (infrastructure/staff issues).
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import PageHeader from "@/components/ui/PageHeader";
import SupportDesk from "./SupportDesk";

export const metadata: Metadata = {
  title: "Support Tickets - Admin",
};

export default async function AdminSupportPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "support.manage"))
    redirect("/403");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Tickets"
        subtitle="Requests from students and staff"
      />
      <SupportDesk />
    </div>
  );
}
