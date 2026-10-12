import { db } from "@/lib/db";
import { getPresignedDownloadUrl } from "@/lib/s3";
import ApprovePaymentButtons from "./ApproveButtons";

export const metadata = { title: "Pending Bank Payments" };

export default async function PendingPaymentsPage() {
  const pending = await db.payment.findMany({
    where: { status: "PENDING_APPROVAL", method: "BANK_TRANSFER" },
    include: {
      enrolment: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, studentNumber: true } },
          course: { select: { title: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Generate presigned URLs for receipts
  const paymentsWithUrls = await Promise.all(
    pending.map(async (p) => {
      let receiptUrl: string | null = null;
      if (p.bankReceiptS3Key) {
        try {
          receiptUrl = await getPresignedDownloadUrl(p.bankReceiptS3Key, 3600);
        } catch {
          receiptUrl = null;
        }
      }
      return { ...p, receiptUrl };
    })
  );

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl mb-2">Pending Bank Payments</h1>
      <p className="text-gray-500 text-sm mb-6">
        Review and approve or reject student bank transfer receipts.
      </p>

      {paymentsWithUrls.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-4xl mb-3" aria-hidden="true">✅</p>
          <p className="text-gray-500">No pending bank payments. All clear!</p>
        </div>
      )}

      <div className="space-y-4">
        {paymentsWithUrls.map((payment) => (
          <div key={payment.id} className="card">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              {/* Student info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold">{payment.enrolment.user.name}</p>
                  {payment.enrolment.user.studentNumber && (
                    <span className="badge-info badge text-xs">{payment.enrolment.user.studentNumber}</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{payment.enrolment.course.title}</p>
                <p className="text-xs text-gray-400">
                  {payment.enrolment.user.email} · {payment.enrolment.user.phone}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-400">Amount</span>
                    <p className="font-bold text-primary">UGX {payment.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Bank</span>
                    <p className="font-medium">{payment.bankName}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Transfer ref</span>
                    <p className="font-mono text-xs">{payment.bankTransferRef}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Submitted</span>
                    <p>{new Date(payment.createdAt).toLocaleDateString("en-UG")}</p>
                  </div>
                </div>
              </div>

              {/* Receipt preview */}
              <div className="flex flex-col items-end gap-3">
                {payment.receiptUrl ? (
                  <a
                    href={payment.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline text-sm no-underline"
                  >
                    📄 View receipt
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">No receipt uploaded</span>
                )}
                <ApprovePaymentButtons paymentId={payment.id} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
