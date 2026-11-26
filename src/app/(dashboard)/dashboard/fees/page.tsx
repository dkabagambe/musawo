import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { CreditCard, AlertCircle, CheckCircle2, Clock } from "lucide-react";
export const dynamic = "force-dynamic";

export const metadata = { title: "My Fees" };

export default async function MyFeesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id, status: { in: ["PENDING_PAYMENT", "PARTIALLY_PAID", "ACTIVE", "COMPLETED", "OVERDUE"] } },
    include: {
      course: { select: { title: true, fullFeeUgx: true } },
      ledger: { orderBy: { createdAt: "desc" } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Fees and Payment Status</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {enrolments.length} course{enrolments.length !== 1 ? "s" : ""} enrolled
        </p>
      </div>

      {enrolments.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">You are not enrolled in any courses yet.</p>
          <Link href="/dashboard/courses" className="text-blue-600 dark:text-blue-400 hover:underline inline-block mt-4">
            Explore Courses
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {enrolments.map((enr) => {
            const totalFee = enr.course.fullFeeUgx ?? 0;
            const paidAmount = enr.paidAmountUgx ?? 0;
            const balanceDue = totalFee - paidAmount;
            const paidPercent = totalFee > 0 ? Math.round((paidAmount / totalFee) * 100) : 0;

            const statusBadge =
              enr.status === "ACTIVE"
                ? { label: "Fully Paid", color: "bg-green-500/10 text-green-700 dark:text-green-400", icon: CheckCircle2 }
                : enr.status === "COMPLETED"
                ? { label: "Completed", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400", icon: CheckCircle2 }
                : enr.status === "PARTIALLY_PAID"
                ? { label: "Partially Paid", color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400", icon: Clock }
                : enr.status === "OVERDUE"
                ? { label: "Overdue", color: "bg-red-500/10 text-red-700 dark:text-red-400", icon: AlertCircle }
                : { label: "Pending Payment", color: "bg-gray-500/10 text-gray-700 dark:text-gray-400", icon: Clock };

            const StatusIcon = statusBadge.icon;

            return (
              <div key={enr.id} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold">{enr.course.title}</h2>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-sm px-2 py-1 rounded-full ${statusBadge.color} flex items-center gap-1`}>
                          <StatusIcon className="w-4 h-4" />
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                    {enr.status !== "ACTIVE" && enr.status !== "COMPLETED" && (
                      <Link
                        href="/dashboard/payments/initiate"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <CreditCard className="w-4 h-4" />
                        Pay Now
                      </Link>
                    )}
                  </div>

                  {/* Overdue warning */}
                  {enr.status === "OVERDUE" && (
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mt-4 flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-red-700 dark:text-red-400">
                        <strong>Payment Overdue:</strong> Your instalment is overdue. Pay now to maintain access to course content.
                      </div>
                    </div>
                  )}

                  {/* Fee breakdown */}
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Fee</div>
                      <div className="font-semibold">UGX {totalFee.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Paid to Date</div>
                      <div className="font-semibold text-green-600 dark:text-green-400">UGX {paidAmount.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Balance Due</div>
                      <div className={`font-semibold ${balanceDue > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                        UGX {balanceDue.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">Payment Progress</div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full transition-all"
                        style={{ width: `${Math.min(paidPercent, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-right">{paidPercent}% paid</div>
                  </div>

                  {/* Access thresholds */}
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {[
                      { percent: 50, label: "Unlock Block 1 & Start learning" },
                      { percent: 75, label: "Unlock Block 2 & Book practicals" },
                      { percent: 100, label: "Unlock Final exam & Earn certificate" },
                    ].map((threshold) => (
                      <div key={threshold.percent} className="text-center">
                        <div
                          className={`text-xs font-medium px-2 py-1 rounded ${
                            paidPercent >= threshold.percent
                              ? "bg-green-500/10 text-green-700 dark:text-green-400"
                              : "bg-gray-500/10 text-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {threshold.percent}%
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{threshold.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment history */}
                {enr.ledger.length > 0 ? (
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-6">
                    <h3 className="font-semibold mb-4">Payment History</h3>
                    <div className="space-y-3">
                      {enr.ledger.map((entry) => (
                        <div key={entry.id} className="flex items-start justify-between text-sm">
                          <div>
                            <div className="font-medium">{entry.description}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {new Date(entry.createdAt).toLocaleDateString()}
                            </div>
                            {entry.receiptNumber && (
                              <div className="text-xs text-gray-600 dark:text-gray-400">Receipt: {entry.receiptNumber}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className={entry.type === "PAYMENT" ? "text-green-600 dark:text-green-400 font-medium" : "text-red-600 dark:text-red-400 font-medium"}>
                              {entry.type === "PAYMENT" ? "+" : "-"}UGX {entry.amount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-6 text-center text-gray-600 dark:text-gray-400">
                    <p className="text-sm">No payment history yet.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
