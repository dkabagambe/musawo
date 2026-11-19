import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import ITSupportDesk from "./ITSupportDesk";
import { getSetting } from "@/lib/settings";

export const metadata = { title: "Support Tickets - IT Admin" };

export default async function SystemSupportPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "support.manage")) redirect("/login");

  const slaHours = await getSetting("support.slaFirstResponseHours", "4");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary">Support Tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            All incoming support requests from students and staff. SLA target: {slaHours} hours for first response.
          </p>
        </div>
      </div>
      <ITSupportDesk />
    </div>
  );
}
