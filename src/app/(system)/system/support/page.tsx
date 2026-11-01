import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import SupportDesk from "@/app/(admin)/admin/support/SupportDesk";

export const metadata = { title: "Support Tickets - IT Admin" };

export default async function SystemSupportPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "support.manage")) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Support Tickets</h1>
        <p className="text-sm text-gray-500 mt-0.5">All incoming support tickets from students and staff</p>
      </div>
      <SupportDesk />
    </div>
  );
}
