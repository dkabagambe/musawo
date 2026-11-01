import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "Ledger - Director" };

interface Props { searchParams: { page?: string } }

export default async function DirectorFinanceLedgerPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "payments.view")) redirect("/login");

  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 50;
  const skip = (page - 1) * take;

  const [entries, total] = await Promise.all([
    db.ledgerEntry.findMany({
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
    db.ledgerEntry.count(),
  ]);

  const totalPages = Math.ceil(total / take);

  const TYPE_STYLE: Record<string, string> = {
    PAYMENT: "badge-success",
    REFUND: "badge-danger",
    ADJUSTMENT: "badge-info",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Ledger</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} entries</p>
        </div>
        <Link href="/director/finance" className="btn-ghost text-sm no-underline ml-auto">Back to Finance</Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Student</th>
              <th className="pb-2 font-medium pr-4">Programme</th>
              <th className="pb-2 font-medium pr-4">Type</th>
              <th className="pb-2 font-medium pr-4">Amount</th>
              <th className="pb-2 font-medium pr-4">Description</th>
              <th className="pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((e) => (
              <tr key={e.id} className="hover:bg-surface/40">
                <td className="py-2.5 pr-4 font-medium">{e.enrolment.user.name}</td>
                <td className="py-2.5 pr-4 text-xs text-gray-500">{e.enrolment.course.title}</td>
                <td className="py-2.5 pr-4">
                  <span className={`badge text-xs ${TYPE_STYLE[e.type] ?? "badge-info"}`}>
                    {e.type}
                  </span>
                </td>
                <td className={`py-2.5 pr-4 font-semibold ${e.type === "PAYMENT" ? "text-success" : "text-danger"}`}>
                  {e.type === "PAYMENT" ? "+" : "-"}UGX {e.amount.toLocaleString()}
                </td>
                <td className="py-2.5 pr-4 text-xs text-gray-500 max-w-xs truncate">
                  {e.description ?? "-"}
                </td>
                <td className="py-2.5 text-xs text-gray-400">
                  {new Date(e.createdAt).toLocaleDateString("en-UG")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">No ledger entries yet.</p>
        )}
        {totalPages > 1 && (
          <div className="flex justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && <Link href={`/director/finance/ledger?page=${page - 1}`} className="btn-outline text-xs px-3 py-1.5 no-underline">Previous</Link>}
              {page < totalPages && <Link href={`/director/finance/ledger?page=${page + 1}`} className="btn-primary text-xs px-3 py-1.5 no-underline">Next</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
