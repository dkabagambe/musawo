import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import BackupsDashboard from "./BackupsDashboard";

export const metadata = { title: "Backups - IT Admin" };
export const dynamic = "force-dynamic";

export default async function BackupsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Database Backups</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Nightly automated backups to S3-compatible storage. 30 daily + 12 monthly retention.
        </p>
      </div>
      <BackupsDashboard />
    </div>
  );
}
