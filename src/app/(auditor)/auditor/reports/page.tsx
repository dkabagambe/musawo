import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";

export const metadata = { title: "Reports - Auditor" };

export default async function StubPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "audit.comment")) redirect("/login");
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-primary mb-2">Reports - Auditor</h1>
      <div className="card mt-8 p-8 text-center">
        <p className="text-gray-500 text-sm">This section is coming in a future release.</p>
      </div>
    </div>
  );
}
