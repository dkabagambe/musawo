import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";

export const metadata = { title: "Payments - Admin" };

interface Props {
  searchParams: {
    status?: string;
    gateway?: string;
    from?: string;
    to?: string;
    page?: string;
  };
}

export default async function AdminPaymentsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "payments.view"))
    redirect("/403");

  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 25;
  const skip = (page - 1) * take;

  const where: Record<string, unknown> = {};
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.gateway) where.gateway = searchParams.gateway;
  if (searchParams.from || searchParams.to) {
    where.createdAt = {
      ...(searchParams.from ? { gte: new Date(searchParams.from) } : {}),
      ...(searchParams.to
        ? { lte: new Date(searchParams.to + "T23:59:59Z") }
        : {}),
    };
  }

  const [payments, total, sumResult] = await Promise.all([
    db.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        enrolment: {
          include: {
            user: { select: { name: true, email: true } },
            course: { select: { title: true } },
          },
        },
      },
    }),
    db.payment.count({ where }),
    db.payment.aggregate({ where, _sum: { amount: true } }),
  ]);

  const totalPages = Math.ceil(total / take);
  const totalSum = sumResult._sum.amount ?? 0;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">Payments</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/payments/pending"
            className="btn-outline text-sm no-underline"
          >
            Bank approvals
          </Link>
          <a
            href="/api/admin/payments/export"
            className="btn-outline text-sm no-underline"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="card mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label text-xs">Status</label>
          <select
            name="status"
            defaultValue={searchParams.status ?? ""}
            className="input w-auto text-sm"
          >
            <option value="">All statuses</option>
            {[
              "PENDING",
              "PENDING_APPROVAL",
              "COMPLETED",
              "FAILED",
              "REFUNDED",
            ].map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs">Gateway</label>
          <select
            name="gateway"
            defaultValue={searchParams.gateway ?? ""}
            className="input w-auto text-sm"
          >
            <option value="">All gateways</option>
            {["PESAPAL", "FLUTTERWAVE", "MANUAL"].map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs">From</label>
          <input
            name="from"
            type="date"
            defaultValue={searchParams.from ?? ""}
            className="input text-sm"
          />
        </div>
        <div>
          <label className="label text-xs">To</label>
          <input
            name="to"
            type="date"
            defaultValue={searchParams.to ?? ""}
            className="input text-sm"
          />
        </div>
        <button type="submit" className="btn-primary text-sm">
          Filter
        </button>
        <a href="/admin/payments" className="btn-ghost text-sm no-underline">
          Clear
        </a>
      </form>

      {/* Summary */}
      <div className="flex gap-4 mb-4">
        <div className="card py-3 px-5 flex-1 text-center">
          <p className="text-xl font-bold text-primary">
            {total.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">Transactions</p>
        </div>
        <div className="card py-3 px-5 flex-1 text-center">
          <p className="text-xl font-bold text-success">
            UGX {totalSum.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">Total (filtered)</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Student</th>
              <th className="pb-2 font-medium pr-4">Course</th>
              <th className="pb-2 font-medium pr-4 text-right">Amount</th>
              <th className="pb-2 font-medium pr-4">Method</th>
              <th className="pb-2 font-medium pr-4">Gateway</th>
              <th className="pb-2 font-medium pr-4">Status</th>
              <th className="pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="py-2 pr-4">
                  <p className="font-medium">{p.enrolment.user.name}</p>
                  <p className="text-xs text-gray-400">
                    {p.enrolment.user.email}
                  </p>
                </td>
                <td className="py-2 pr-4 text-gray-500 text-xs">
                  {p.enrolment.course.title}
                </td>
                <td className="py-2 pr-4 font-medium text-right">
                  UGX {p.amount.toLocaleString()}
                </td>
                <td className="py-2 pr-4 text-xs text-gray-500">
                  {p.method.replace("_", " ")}
                </td>
                <td className="py-2 pr-4 text-xs text-gray-500">{p.gateway}</td>
                <td className="py-2 pr-4">
                  {p.status === "COMPLETED" ? (
                    <span className="badge badge-success text-xs">Paid</span>
                  ) : p.status === "PENDING" ? (
                    <span className="badge badge-warning text-xs">Pending</span>
                  ) : p.status === "PENDING_APPROVAL" ? (
                    <span className="badge badge-warning text-xs">
                      Awaiting approval
                    </span>
                  ) : p.status === "FAILED" ? (
                    <span className="badge badge-danger text-xs">Failed</span>
                  ) : (
                    <span className="badge text-xs">{p.status}</span>
                  )}
                </td>
                <td className="py-2 text-xs text-gray-400">
                  {new Date(p.createdAt).toLocaleDateString("en-UG")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <a
                  href={`/admin/payments?page=${page - 1}`}
                  className="btn-outline text-xs px-3 py-1.5 no-underline"
                >
                  Previous
                </a>
              )}
              {page < totalPages && (
                <a
                  href={`/admin/payments?page=${page + 1}`}
                  className="btn-primary text-xs px-3 py-1.5 no-underline"
                >
                  Next
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
