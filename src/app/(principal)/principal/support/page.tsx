import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import SupportDesk from "./SupportDesk";

export const metadata = { title: "Support - Principal" };

export default async function PrincipalSupportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "support.submit")) redirect("/403");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Support</h1>
        <p className="text-sm text-gray-500 mt-1">
          Submit support requests to IT Admin or view your tickets
        </p>
      </div>
      <SupportDesk />
    </div>
  );
}
