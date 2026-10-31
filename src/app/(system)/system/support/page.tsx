import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";

export const metadata = { title: "Support Tickets - IT Admin" };

export default async function SystemSupportPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "support.manage")) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Support Tickets</h1>
        <p className="text-sm text-gray-500 mt-0.5">All incoming support tickets</p>
      </div>
      <div className="card py-16 text-center text-gray-400 text-sm">
        Support ticket management coming soon.
      </div>
    </div>
  );
}
