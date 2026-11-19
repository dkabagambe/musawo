import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import DatabaseDiagnostics from "./DatabaseDiagnostics";

export const metadata = { title: "Database - IT Admin" };
export const dynamic = "force-dynamic";

export default async function DatabasePage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Database Diagnostics</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Read-only database health and performance metrics. No SQL console or row data access.
        </p>
      </div>
      <DatabaseDiagnostics />
    </div>
  );
}
