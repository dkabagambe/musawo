import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";

export const metadata = { title: "Certificates - Director" };

export default async function DirectorCertificatesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "certificates.view")) redirect("/login");

  const total = await db.certificate.count();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Certificates</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} certificate{total !== 1 ? "s" : ""} issued</p>
      </div>
      <div className="card py-16 text-center text-gray-400 text-sm">
        Certificate register coming soon.
      </div>
    </div>
  );
}
