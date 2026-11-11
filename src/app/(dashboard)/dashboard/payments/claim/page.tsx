import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import Link from "next/link";
import PaymentClaimForm from "./PaymentClaimForm";
export const dynamic = "force-dynamic";

export const metadata = { title: "Submit Payment - Student Portal" };

export default async function PaymentClaimPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Load enrolments that still need payment
  const enrolments = await db.enrolment.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["PENDING_PAYMENT", "PARTIALLY_PAID"] },
    },
    include: { course: { select: { id: true, title: true, fullFeeUgx: true } } },
    orderBy: { createdAt: "desc" },
  });

  const [mtnCode, airtelId, activeClaimsCount] = await Promise.all([
    getSetting("payment.mtnMomoCode", "582962"),
    getSetting("payment.airtelMerchantId", "4363108"),
    db.manualPaymentClaim.count({
      where: { claimantId: session.user.id, status: "SUBMITTED" },
    }),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/payments"
          className="text-sm text-gray-400 hover:text-primary no-underline"
        >
          &larr; Back to payments
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-primary">Submit a Payment</h1>
        <p className="text-gray-500 text-sm mt-1">
          Paid by MTN MoMo or Airtel Money? Enter the transaction details below
          so the Admin can verify and unlock your course access.
        </p>
      </div>

      {/* How to pay reminder */}
      <div className="card bg-primary/5 border-primary/20 space-y-3">
        <h2 className="text-sm font-bold text-primary">How to pay</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="font-semibold text-gray-700">MTN Mobile Money</p>
            <p className="text-xs text-gray-500">
              Dial <span className="font-mono font-bold">*165*3#</span> or open
              the MoMo app &rarr; Pay Bill
            </p>
            <p className="text-xs text-gray-500">
              Merchant code:{" "}
              <span className="font-mono font-bold text-primary">{mtnCode}</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-gray-700">Airtel Money</p>
            <p className="text-xs text-gray-500">
              Dial <span className="font-mono font-bold">*185*9#</span> on
              your Airtel line
            </p>
            <p className="text-xs text-gray-500">
              Merchant ID:{" "}
              <span className="font-mono font-bold text-primary">{airtelId}</span>
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Fees are paid in three phases: 50% before reporting, then 25%, then
          the final 25%. Pay the phase amount shown on your invoice and enter
          the same amount below.
        </p>
      </div>

      {activeClaimsCount > 0 && (
        <div className="card bg-warning/10 border-warning/30">
          <p className="text-sm font-semibold text-amber-800">
            You have {activeClaimsCount} claim
            {activeClaimsCount !== 1 ? "s" : ""} awaiting review.
          </p>
          <p className="text-xs text-amber-700 mt-1">
            The Admin will verify and update your balance. You can submit
            another claim only once the previous one is processed, or if you
            paid a different instalment.
          </p>
        </div>
      )}

      {enrolments.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-gray-500 text-sm">
            No enrolments are currently awaiting payment.
          </p>
          <Link
            href="/dashboard/payments"
            className="btn-secondary text-sm no-underline mt-4 inline-block"
          >
            View payment history
          </Link>
        </div>
      ) : (
        <PaymentClaimForm enrolments={enrolments} />
      )}
    </div>
  );
}
