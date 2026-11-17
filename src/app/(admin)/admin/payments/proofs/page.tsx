import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";

export const metadata = { title: "Payment Proofs - Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPaymentProofsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "finance.proof.collect")) redirect("/403");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Payment Proofs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Collect and submit student payment proofs for approval
        </p>
      </div>

      <div className="card">
        <h2 className="font-semibold text-lg mb-3">Proof Collection Process</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
          <li>Select student and payment phase</li>
          <li>Enter transaction ID, amount, date/time, method (MTN or Airtel Mobile Money)</li>
          <li>Attach screenshot (5 MB limit)</li>
          <li>System checks: unique transaction ID, duplicate image, amount vs phase</li>
          <li>Submit to Principal for forwarding to Director</li>
          <li>Track status: Admin → Principal → Director</li>
        </ol>
        <p className="text-sm text-gray-500 mt-4">
          Full implementation in A6.
        </p>
      </div>
    </div>
  );
}
