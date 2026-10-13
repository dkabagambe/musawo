import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
export const metadata = { title: "Ledger - Bursar" };

export default async function BursarLedgerPage() {
  const session = await auth();
  if (!session?.user || !["SUPERADMIN","BURSAR"].includes(session.user.role)) redirect("/login");

  const entries = await db.ledgerEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      enrolment: {
        include: {
          user:   { select: { name: true } },
          course: { select: { title: true } },
        },
      },
    },
  });

  const totals = await db.ledgerEntry.groupBy({
    by: ["type"],
    _sum: { amount: true },
  });

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl mb-6">Ledger</h1>

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {totals.map((t) => (
          <div key={t.type} className="card text-center">
            <p className="text-xl font-bold text-primary">UGX {(t._sum.amount ?? 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">{t.type.replace("_"," ")}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <h2 className="font-semibold mb-4">Recent entries</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Student</th>
              <th className="pb-2 font-medium pr-4">Course</th>
              <th className="pb-2 font-medium pr-4">Type</th>
              <th className="pb-2 font-medium pr-4 text-right">Amount</th>
              <th className="pb-2 font-medium pr-4 text-right">Balance after</th>
              <th className="pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="py-2 pr-4 font-medium">{e.enrolment.user.name}</td>
                <td className="py-2 pr-4 text-gray-500 text-xs">{e.enrolment.course.title}</td>
                <td className="py-2 pr-4">
                  <span className={`badge text-xs ${e.type === "PAYMENT" ? "badge-success" : e.type === "REFUND" ? "badge-danger" : "badge-info"}`}>
                    {e.type}
                  </span>
                </td>
                <td className="py-2 pr-4 text-right font-medium">UGX {e.amount.toLocaleString()}</td>
                <td className="py-2 pr-4 text-right text-gray-500">UGX {e.balanceAfter.toLocaleString()}</td>
                <td className="py-2 text-xs text-gray-400">{new Date(e.createdAt).toLocaleDateString("en-UG")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
