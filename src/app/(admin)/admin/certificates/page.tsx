import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";

export const metadata = { title: "Certificate Lists - Admin" };
export const dynamic = "force-dynamic";

export default async function AdminCertificatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "certificates.view")) redirect("/403");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Certificate Lists</h1>
        <p className="text-sm text-gray-500 mt-1">
          Students who meet all requirements for certificate issuance
        </p>
      </div>

      <div className="card">
        <p className="text-sm text-gray-600">
          List students who meet every requirement: lessons complete, exams passed,
          practicals signed, log book signed, attendance met, fees at 100 percent.
          Prepare the list for the Principal, who requests issuance from the Director.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Full implementation in A5.
        </p>
      </div>
    </div>
  );
}
