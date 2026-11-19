import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import SystemHealthDashboard from "./SystemHealthDashboard";

export const metadata = { title: "System Health - IT Admin" };
export const dynamic = "force-dynamic";

export default async function SystemHealthPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">System Health</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Live status of all services. Refreshes every 30 seconds.
        </p>
      </div>
      <SystemHealthDashboard />
    </div>
  );
}
