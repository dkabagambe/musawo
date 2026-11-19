import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import SystemLogsView from "./SystemLogsView";

export const metadata = { title: "System Logs - IT Admin" };
export const dynamic = "force-dynamic";

export default async function SystemLogsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">System Logs</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Structured infrastructure logs: errors, warnings, job runs, service events. No personal data or secrets. 30-day retention.
        </p>
      </div>
      <SystemLogsView />
    </div>
  );
}
