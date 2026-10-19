import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
export const metadata = { title: "Auditor Overview" };
export default async function AuditorPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "audit.comment")) redirect("/login");
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-primary mb-2">Auditor / Legal Advisor</h1>
      <p className="text-gray-500 text-sm">View-only access to records, audit logs, compliance reports and policies.</p>
      <div className="card mt-8 p-8 text-center">
        <p className="text-gray-500 text-sm">Full Auditor portal coming in Batch E.</p>
      </div>
    </div>
  );
}
