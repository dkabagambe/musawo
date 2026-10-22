import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import OperationsDesk from "../OperationsDesk";

export const metadata = { title: "Skills Lab Equipment" };

export default async function EquipmentPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "equipment.manage"))
    redirect("/403");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Skills Lab Equipment"
        subtitle="Preparation checklist for practical sessions"
      />
      <OperationsDesk mode="equipment" />
    </div>
  );
}
