import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";

export const metadata = { title: "Reports & Analytics - Director" };

export default async function DirectorReportsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "reports.view")) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Reports & Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Institution-wide performance, enrolment and financial reports</p>
      </div>
      <div className="card py-16 text-center text-gray-400 text-sm">
        Reports coming soon.
      </div>
    </div>
  );
}
