import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import OperationsDesk from "../OperationsDesk";

export const metadata = { title: "Operational Notices" };

export default async function NoticesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "operational_notices.manage"))
    redirect("/403");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational Notices"
        subtitle="Logistics updates for students and staff"
      />
      <OperationsDesk mode="notices" />
    </div>
  );
}
