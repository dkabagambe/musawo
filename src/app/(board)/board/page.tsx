import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
export const metadata = { title: "Board Overview" };
export default async function BoardPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "reports.board")) redirect("/login");
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-primary mb-2">Board Overview</h1>
      <p className="text-gray-500 text-sm">Aggregated reports and institution performance.</p>
      <div className="card mt-8 p-8 text-center">
        <p className="text-gray-500 text-sm">Board reports coming in Batch E.</p>
      </div>
    </div>
  );
}
