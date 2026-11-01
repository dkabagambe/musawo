import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "All Payments - Director" };

interface Props { searchParams: { page?: string; status?: string } }

export default async function DirectorFinancePaymentsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "payments.view")) redirect("/login");

  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 40;
  const skip = (page - 1) * take;
  const statusFilter = searchParams.status;

  const where = statusFilter ? { status: statusFilter as never } : {};

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        enrolment: {
          include: {
            user: { select: { name: true, studentNumber: true } },
            course: { select: { title: true } },
          },
        },
      },
    }),
    db.payment.count({ where }),
  ]);

  const totalPages = Math.ceil(total / take);

  const STATUS_STYLE: Record<string, string> = {
    COMPLETED: "badge-success",
    PENDING: "badge-warning",
    PENDING_APPROVAL: "badge-warning",
    FAILED: "badge-danger",
    REFUNDED: "badge-info",
  };

  const STATUSES = ["", "COMPLETED", "PENDING", "PENDING_APPROVAL", "FAILED", "REFUNDED"];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary">All Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} transactions</p>
        </div>
        <Link href="/director/finance" className="btn-ghost text-sm no-underline ml-auto">Back to Finance</Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <Link
            key={s || "ALL"}
            href={`/director/finance/payments${s ? `?status=${s}` : ""}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium no-underline transition-colors ${
              (statusFilter ?? "") === s ? "bg-primary text-white" : "bg-surface text-gray-600 hover:bg-primary/10"
            }`}
          >
            {s || "All"}
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Student</th>
              <th className="pb-2 font-medium pr-4">Student No.</th>
              <th className="pb-2 font-medium pr-4">Programme</th>
              <th className="pb-2 font-medium pr-4">Amount</th>
              <th className="pb-2 font-medium pr-4">Method</th>
              <th className="pb-2 font-medium pr-4">Status</th>
              <th className="pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-surface/40">
                <td className="py-2.5 pr-4 font-medium">{p.enrolment.user.name}</td>
                <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">{p.enrolment.user.studentNumber ?? "-"}</td>
                <td className="py-2.5 pr-4 text-xs text-gray-500">{p.enrolment.course.title}</td>
                <td className="py-2.5 pr-4 font-semibold text-primary">UGX {p.amount.toLocaleString()}</td>
                <td className="py-2.5 pr-4 text-xs text-gray-500">{p.method.replace("_", " ")}</td>
                <td className="py-2.5 pr-4">
                  <span className={`badge text-xs ${STATUS_STYLE[p.status] ?? "badge-info"}`}>
                    {p.status.replace("_", " ")}
                  </span>
                </td>
                <td className="py-2.5 text-xs text-gray-400">
                  {new Date(p.createdAt).toLocaleDateString("en-UG")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">No payments found.</p>
        )}
        {totalPages > 1 && (
          <div className="flex justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && <Link href={`/director/finance/payments?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ""}`} className="btn-outline text-xs px-3 py-1.5 no-underline">Previous</Link>}
              {page < totalPages && <Link href={`/director/finance/payments?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ""}`} className="btn-primary text-xs px-3 py-1.5 no-underline">Next</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
