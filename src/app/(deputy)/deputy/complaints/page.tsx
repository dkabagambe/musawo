import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";

export const metadata = { title: "Complaints - Deputy Principal" };

export default async function StubPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "support.manage")) redirect("/login");
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-primary mb-2">Complaints - Deputy Principal</h1>
      <div className="card mt-8 p-8 text-center">
        <p className="text-gray-500 text-sm">This section is coming in a future release.</p>
      </div>
    </div>
  );
}
