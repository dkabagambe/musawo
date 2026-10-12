import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id },
    include: {
      course: { select: { title: true } },
      payments: { orderBy: { createdAt: "desc" } },
      ledger: { orderBy: { createdAt: "desc" }, take: 5 },
      instalments: { orderBy: { number: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl mb-6">Payments</h1>

      {enrolments.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-gray-500">No payment records yet.</p>
        </div>
      )}

      {enrolments.map((enr) => (
        <div key={enr.id} className="card mb-6">
          <h2 className="font-semibold mb-1">{enr.course.title}</h2>
          <div className="flex gap-4 text-sm text-gray-500 mb-4">
            <span>
              Paid: UGX {enr.paidAmountUgx.toLocaleString()} of{" "}
              {enr.totalAmountUgx.toLocaleString()}
            </span>
            <span className="badge-info badge capitalize">
              {enr.status.toLowerCase().replace("_", " ")}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-border rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all"
              style={{
                width: `${Math.min(
                  100,
                  enr.totalAmountUgx > 0
                    ? Math.round((enr.paidAmountUgx / enr.totalAmountUgx) * 100)
                    : 0
                )}%`,
              }}
              aria-label={`${Math.round((enr.paidAmountUgx / enr.totalAmountUgx) * 100)}% paid`}
            />
          </div>

          {/* Instalments */}
          {enr.instalments.length > 1 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Instalment plan</h3>
              <div className="space-y-2">
                {enr.instalments.map((inst) => (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>Instalment {inst.number}</span>
                    <span>UGX {inst.amount.toLocaleString()}</span>
                    {inst.paidAt ? (
                      <span className="badge-success badge">Paid</span>
                    ) : (
                      <span className="badge-warning badge">Pending</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment history */}
          {enr.payments.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Transactions</h3>
              <div className="divide-y divide-border">
                {enr.payments.map((pmt) => (
                  <div
                    key={pmt.id}
                    className="py-2 flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        UGX {pmt.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(pmt.createdAt).toLocaleDateString("en-UG")} ·{" "}
                        {pmt.method.replace("_", " ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {pmt.status === "COMPLETED" ? (
                        <span className="badge-success badge">Paid</span>
                      ) : pmt.status === "PENDING" ? (
                        <span className="badge-warning badge">Pending</span>
                      ) : (
                        <span className="badge-danger badge">{pmt.status}</span>
                      )}
                      {pmt.receiptS3Key && (
                        <Link
                          href={`/api/payments/receipt?paymentId=${pmt.id}`}
                          className="text-xs text-accent no-underline"
                        >
                          Receipt
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pay next instalment */}
          {enr.status === "ACTIVE" && enr.paidAmountUgx < enr.totalAmountUgx && (
            <div className="mt-4 pt-4 border-t border-border">
              <Link
                href={`/courses/${enr.courseId}/enrol?enrolmentId=${enr.id}`}
                className="btn-primary text-sm no-underline"
              >
                Pay next instalment
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
