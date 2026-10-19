import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { CreditCard, CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";

export const metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id },
    include: {
      course: { select: { title: true, slug: true } },
      payments: { orderBy: { createdAt: "desc" } },
      instalments: { orderBy: { number: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const METHOD_LABEL: Record<string, string> = {
    MTN_MOMO: "MTN MoMo", AIRTEL_MONEY: "Airtel Money",
    BANK_TRANSFER: "Bank Transfer",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Payments</h1>
        <p className="text-gray-500 text-sm mt-1">Your payment history and instalment plans</p>
      </div>

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

            {/* Instalment plan */}
            {enr.instalments.length > 1 && (
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Instalment Plan</h3>
                <div className="space-y-2">
                  {enr.instalments.map((inst) => (
                    <div key={inst.id} className="flex items-center gap-3 text-sm">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${inst.paidAt ? "bg-success/10" : "bg-surface"}`}>
                        {inst.paidAt
                          ? <CheckCircle2 className="w-4 h-4 text-success" />
                          : <Clock className="w-4 h-4 text-gray-300" />}
                      </div>
                      <span className="flex-1 text-gray-600">Instalment {inst.number}</span>
                      <span className="font-semibold text-primary">UGX {inst.amount.toLocaleString()}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${inst.paidAt ? "bg-success/10 text-success" : "bg-warning/10 text-amber-700"}`}>
                        {inst.paidAt ? "Paid" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction history */}
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
                          {METHOD_LABEL[pmt.method] ?? pmt.method.replace(/_/g," ")} · {new Date(pmt.createdAt).toLocaleDateString("en-UG")}
                        </p>
                      </div>
                      {pmt.gatewayRef && (
                        <span className="font-mono text-xs text-gray-400 hidden sm:block">{pmt.gatewayRef}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pay CTA */}
            {remaining > 0 && enr.status !== "PENDING_PAYMENT" && (
              <div className="px-6 py-4 bg-surface border-t border-border">
                <Link href={`/courses/${enr.course.slug}`}
                  className="btn-primary no-underline inline-flex items-center gap-2 text-sm">
                  Pay next instalment <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
