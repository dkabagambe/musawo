import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  CreditCard, CheckCircle2, Clock, XCircle, ArrowRight,
  AlertCircle, FileText, Download, ShieldAlert,
} from "lucide-react";
export const dynamic = "force-dynamic";

export const metadata = { title: "My Fees" };

/** Map a claim status to a human-readable phase status label. */
function claimStatusLabel(status: string): string {
  switch (status) {
    case "SUBMITTED": return "Submitted - with Admin";
    case "UNDER_REVIEW": return "With Principal (second review)";
    case "VERIFIED": return "Approved";
    case "REJECTED": return "Rejected";
    default: return status;
  }
}

export default async function PaymentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id },
    include: {
      course: { select: { title: true, slug: true } },
      payments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true, amount: true, method: true, status: true,
          createdAt: true, gatewayRef: true, receiptNumber: true,
          paidAt: true,
        },
      },
      instalments: {
        orderBy: { number: "asc" },
        select: { id: true, number: true, amount: true, dueDate: true, paidAt: true },
      },
      claims: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true, status: true, amount: true, transactionId: true,
          rejectionReason: true, createdAt: true, method: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const METHOD_LABEL: Record<string, string> = {
    MTN_MOMO: "MTN MoMo", AIRTEL_MONEY: "Airtel Money",
    BANK_TRANSFER: "Bank Transfer", MANUAL: "Manual",
  };

  const CLAIM_METHOD_LABEL: Record<string, string> = {
    MOBILE_MONEY_MTN: "MTN MoMo",
    MOBILE_MONEY_AIRTEL: "Airtel Money",
    BANK_TRANSFER: "Bank Transfer",
    CASH: "Cash",
  };

  const PHASE_LABELS = ["50% before reporting", "25% mid-course", "25% final"];
  const now = new Date();

  const outstanding = enrolments.filter(
    (e) => ["PENDING_PAYMENT", "PARTIALLY_PAID", "OVERDUE"].includes(e.status),
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">My Fees</h1>
        <p className="text-gray-500 text-sm mt-1">
          Your payment phases, claims and receipts
        </p>
      </div>

      {/* Outstanding balance reminder */}
      {outstanding.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Outstanding balance</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {outstanding.length === 1
                ? `You have an outstanding balance for ${outstanding[0]!.course.title}. `
                : `You have outstanding balances across ${outstanding.length} courses. `}
              Fees are paid in three phases: 50% before reporting, then 25%, then the final 25%.
              Your content access matches what you have paid.
            </p>
          </div>
          <Link
            href="/dashboard/payments/claim"
            className="btn-primary text-xs no-underline flex-shrink-0 self-center"
          >
            Submit payment
          </Link>
        </div>
      )}

      {enrolments.length === 0 && (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-7 h-7 text-primary/40" />
          </div>
          <p className="text-gray-500 text-sm">No payment records yet.</p>
        </div>
      )}

      {enrolments.map((enr) => {
        const paidPct = enr.totalAmountUgx > 0
          ? Math.min(100, Math.round((enr.paidAmountUgx / enr.totalAmountUgx) * 100))
          : 0;
        const remaining = enr.totalAmountUgx - enr.paidAmountUgx;
        const isOverdue = enr.status === "OVERDUE";

        // Active (non-rejected) claims for this enrolment
        const activeClaims = enr.claims.filter((c) => c.status !== "REJECTED");
        const latestClaim = activeClaims[0] ?? null;

        return (
          <div key={enr.id} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            {/* Course header */}
            <div className="px-6 py-5 border-b border-border">
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-bold text-primary leading-snug">{enr.course.title}</h2>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                  enr.status === "ACTIVE"    ? "bg-success/10 text-success" :
                  enr.status === "COMPLETED" ? "bg-primary/10 text-primary" :
                  enr.status === "OVERDUE"   ? "bg-danger/10 text-danger"   :
                                               "bg-warning/10 text-amber-700"}`}>
                  {enr.status.replace(/_/g, " ")}
                </span>
              </div>

              {/* Payment summary */}
              <div className="grid grid-cols-3 gap-4 mt-4 mb-4">
                <div className="text-center p-3 bg-surface rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Total Fee</p>
                  <p className="font-bold text-primary text-sm">UGX {enr.totalAmountUgx.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 bg-success/5 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Paid</p>
                  <p className="font-bold text-success text-sm">UGX {enr.paidAmountUgx.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 bg-surface rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Remaining</p>
                  <p className={`font-bold text-sm ${remaining > 0 ? "text-warning" : "text-success"}`}>
                    {remaining > 0 ? `UGX ${remaining.toLocaleString()}` : "Fully paid"}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                  <span>Payment progress</span>
                  <span className="font-semibold text-primary">{paidPct}%</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full transition-all" style={{ width: `${paidPct}%` }} />
                </div>
              </div>
            </div>

            {/* Payment hold banner */}
            {isOverdue && (
              <div className="px-6 py-4 bg-danger/5 border-b border-danger/20">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-danger">Payment hold</p>
                    <p className="text-xs text-danger mt-0.5">
                      Your instalment is overdue{enr.graceUntil && enr.graceUntil > now ? `. Grace period ends ${enr.graceUntil.toLocaleDateString("en-UG")}.` : "."}
                      {" "}Submit your next payment to restore access to your course content.
                    </p>
                    <Link
                      href="/dashboard/payments/claim"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary no-underline hover:underline mt-2"
                    >
                      Pay now <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Fee phases with status */}
            {enr.instalments.length > 1 && (
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Fee Phases</h3>
                <div className="space-y-3">
                  {enr.instalments.map((inst, idx) => {
                    const phaseLabel = PHASE_LABELS[idx] ?? `Phase ${inst.number}`;
                    const isPaid = !!inst.paidAt;
                    const isDue = !isPaid && inst.dueDate && new Date(inst.dueDate) <= now;
                    const isNotDue = !isPaid && inst.dueDate && new Date(inst.dueDate) > now;

                    // Determine status: check if there's a claim that could be for this phase
                    let phaseStatus: string;
                    let statusColor: string;
                    if (isPaid) {
                      phaseStatus = "Approved";
                      statusColor = "text-success";
                    } else if (latestClaim && latestClaim.status !== "VERIFIED") {
                      phaseStatus = claimStatusLabel(latestClaim.status);
                      statusColor = latestClaim.status === "REJECTED" ? "text-danger" : "text-amber-700";
                    } else if (isDue) {
                      phaseStatus = "Due";
                      statusColor = "text-warning";
                    } else if (isNotDue) {
                      phaseStatus = "Not due";
                      statusColor = "text-gray-400";
                    } else {
                      phaseStatus = "Pending";
                      statusColor = "text-gray-400";
                    }

                    return (
                      <div key={inst.id} className="flex items-center gap-3 text-sm">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isPaid ? "bg-success/10" : isDue ? "bg-danger/10" : "bg-surface"
                        }`}>
                          {isPaid
                            ? <CheckCircle2 className="w-4 h-4 text-success" />
                            : isDue
                            ? <AlertCircle className="w-4 h-4 text-danger" />
                            : <Clock className="w-4 h-4 text-gray-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-700 font-medium">Phase {inst.number}: {phaseLabel}</span>
                          <span className="block text-xs text-gray-400">
                            UGX {inst.amount.toLocaleString()}
                            {inst.dueDate && !isPaid && (
                              <> - due {new Date(inst.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</>
                            )}
                          </span>
                        </div>
                        <span className={`text-xs font-semibold ${statusColor} flex-shrink-0`}>
                          {phaseStatus}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active claims with approval-chain status */}
            {activeClaims.length > 0 && (
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Payment Claims</h3>
                <div className="space-y-2">
                  {activeClaims.map((claim) => (
                    <div key={claim.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        claim.status === "VERIFIED" ? "bg-success/10" :
                        claim.status === "REJECTED" ? "bg-danger/10" : "bg-warning/10"
                      }`}>
                        {claim.status === "VERIFIED"
                          ? <CheckCircle2 className="w-4 h-4 text-success" />
                          : claim.status === "REJECTED"
                          ? <XCircle className="w-4 h-4 text-danger" />
                          : <Clock className="w-4 h-4 text-amber-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary">
                          UGX {claim.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {CLAIM_METHOD_LABEL[claim.method] ?? claim.method.replace(/_/g, " ")}
                          {" "}- {claim.transactionId}
                        </p>
                        {claim.status === "REJECTED" && claim.rejectionReason && (
                          <p className="text-xs text-danger mt-1">
                            Reason: {claim.rejectionReason}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                        claim.status === "VERIFIED" ? "bg-success/10 text-success" :
                        claim.status === "REJECTED" ? "bg-danger/10 text-danger" :
                        "bg-warning/10 text-amber-700"
                      }`}>
                        {claimStatusLabel(claim.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction history with receipts */}
            {enr.payments.length > 0 && (
              <div className="px-6 py-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Transactions</h3>
                <div className="space-y-2">
                  {enr.payments.map((pmt) => (
                    <div key={pmt.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        pmt.status === "COMPLETED" ? "bg-success/10" :
                        pmt.status === "REFUNDED"  ? "bg-danger/10"  : "bg-warning/10"}`}>
                        {pmt.status === "COMPLETED" ? <CheckCircle2 className="w-4 h-4 text-success" /> :
                         pmt.status === "REFUNDED"  ? <XCircle className="w-4 h-4 text-danger" /> :
                                                      <Clock className="w-4 h-4 text-amber-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary">UGX {pmt.amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">
                          {METHOD_LABEL[pmt.method] ?? pmt.method.replace(/_/g," ")}
                          {" "}- {new Date(pmt.createdAt).toLocaleDateString("en-UG")}
                        </p>
                        {pmt.receiptNumber && (
                          <p className="text-xs text-gray-300 font-mono">{pmt.receiptNumber}</p>
                        )}
                      </div>
                      {/* Receipt download */}
                      {pmt.status === "COMPLETED" && (
                        <Link
                          href={`/api/payments/${pmt.id}/receipt`}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary no-underline hover:underline flex-shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Receipt
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pay CTA */}
            {remaining > 0 && enr.status !== "PENDING_PAYMENT" && !isOverdue && (
              <div className="px-6 py-4 bg-surface border-t border-border">
                <Link href="/dashboard/payments/claim"
                  className="btn-primary no-underline inline-flex items-center gap-2 text-sm">
                  Submit next payment <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
            {(enr.status === "PENDING_PAYMENT" || isOverdue) && remaining > 0 && (
              <div className="px-6 py-4 bg-warning/5 border-t border-border">
                <p className="text-xs text-amber-700 mb-2">
                  {isOverdue
                    ? "Your instalment is overdue. Submit proof of payment to restore access."
                    : "Your enrolment is awaiting payment. Submit proof of payment to unlock course content."}
                </p>
                <Link href="/dashboard/payments/claim"
                  className="btn-primary no-underline inline-flex items-center gap-2 text-sm">
                  Submit payment claim <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
