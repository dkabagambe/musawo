import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import IntegrationsDashboard from "./IntegrationsDashboard";

export const metadata = { title: "Integrations - IT Admin" };
export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">System Integrations</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          External service connections and health checks. Secrets are never displayed.
        </p>
      </div>
      <IntegrationsDashboard />
    </div>
  );
}
