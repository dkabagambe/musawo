import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import StorageDashboard from "./StorageDashboard";

export const metadata = { title: "Storage - IT Admin" };
export const dynamic = "force-dynamic";

export default async function StoragePage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Storage Management</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          S3-compatible storage health, usage statistics, and retention oversight.
        </p>
      </div>
      <StorageDashboard />
    </div>
  );
}
