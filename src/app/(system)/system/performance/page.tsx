import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import PerformanceDashboard from "./PerformanceDashboard";

export const metadata = { title: "Performance - IT Admin" };
export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Performance Metrics</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Request duration, error rates, and slowest routes. Metrics collected for all requests.
        </p>
      </div>
      <PerformanceDashboard />
    </div>
  );
}
