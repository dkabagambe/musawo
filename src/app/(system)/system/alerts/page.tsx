import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import AlertsDashboard from "./AlertsDashboard";
import { db } from "@/lib/db";

export const metadata = { title: "Alerts - IT Admin" };
export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) redirect("/login");

  const openCount = await db.alertItem.count({ where: { status: "OPEN" } });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary">Alerts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            System alerts requiring attention.
            {openCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                {openCount} open
              </span>
            )}
          </p>
        </div>
      </div>
      <AlertsDashboard />
    </div>
  );
}
