import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import LeaveDesk from "./LeaveDesk";

export const metadata = { title: "Staff Leave" };

export default async function LeavePage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "staff.leave.manage"))
    redirect("/403");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Leave"
        subtitle="Review and decide staff leave requests"
      />
      <LeaveDesk />
    </div>
  );
}
