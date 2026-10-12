import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import CompleteReviewForm from "./CompleteReviewForm";

export const metadata = { title: "Access Review — Director" };

function currentQuarter(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${q}`;
}

export default async function AccessReviewPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPERADMIN") redirect("/login");

  const quarter = currentQuarter();

  const [reviews, staffAccounts] = await Promise.all([
    db.accessReview.findMany({ orderBy: { completedAt: "desc" }, take: 8 }),
    db.user.findMany({
      where: { role: { in: ["SUPERADMIN","SYSTEM_IT","REGISTRAR","BURSAR","TUTOR","ADMIN"] } },
      select: { id: true, name: true, role: true, status: true, totpEnabled: true, lastAccessReviewAt: true, createdAt: true },
      orderBy: { role: "asc" },
    }),
    db.user.count({ where: { role: "SUPERADMIN" } }),
  ]);

  const thisQuarterDone = reviews.some((r) => r.quarter === quarter);

  // Flag accounts that need attention
  const staleThreshold = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days
  const flagged = staffAccounts.filter(
    (s) => !s.lastAccessReviewAt || s.lastAccessReviewAt < staleThreshold
  );

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl mb-2">Quarterly Access Review</h1>
      <p className="text-gray-500 text-sm mb-6">
        Review all staff roles every quarter. Confirm accounts are still appropriate or initiate changes.
      </p>

      {/* Current quarter status */}
      <div className={`card mb-6 ${thisQuarterDone ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{quarter} Review</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {thisQuarterDone ? "✅ Completed" : "⚠️ Not yet completed"}
            </p>
          </div>
          <span className={`badge text-sm ${thisQuarterDone ? "badge-success" : "badge-warning"}`}>
            {thisQuarterDone ? "Done" : "Due"}
          </span>
        </div>
        {!thisQuarterDone && <CompleteReviewForm quarter={quarter} />}
      </div>

      {/* Flagged accounts */}
      {flagged.length > 0 && (
        <div className="card mb-6 border-danger/20 bg-danger/5">
          <h2 className="font-semibold text-danger mb-3">⚠️ Accounts not reviewed in 90+ days ({flagged.length})</h2>
          <div className="space-y-2">
            {flagged.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="text-gray-500">{s.role.replace("_"," ")}</span>
                <span className="text-gray-400 text-xs">
                  {s.lastAccessReviewAt ? new Date(s.lastAccessReviewAt).toLocaleDateString("en-UG") : "Never reviewed"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All staff */}
      <div className="card overflow-x-auto mb-6">
        <h2 className="font-semibold mb-4">All staff accounts ({staffAccounts.length})</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Name</th>
              <th className="pb-2 font-medium pr-4">Role</th>
              <th className="pb-2 font-medium pr-4">Status</th>
              <th className="pb-2 font-medium pr-4">2FA</th>
              <th className="pb-2 font-medium">Last reviewed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {staffAccounts.map((s) => (
              <tr key={s.id}>
                <td className="py-2 pr-4 font-medium">{s.name}</td>
                <td className="py-2 pr-4"><span className="badge badge-info text-xs">{s.role.replace("_"," ")}</span></td>
                <td className="py-2 pr-4">
                  {s.status === "ACTIVE" ? <span className="badge badge-success text-xs">Active</span> : <span className="badge badge-danger text-xs">{s.status}</span>}
                </td>
                <td className="py-2 pr-4">
                  {s.totpEnabled ? <span className="text-success text-xs">✅</span> : <span className="text-danger text-xs">❌</span>}
                </td>
                <td className="py-2 text-xs text-gray-400">
                  {s.lastAccessReviewAt ? new Date(s.lastAccessReviewAt).toLocaleDateString("en-UG") : "Never"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Review history */}
      {reviews.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4">Review history</h2>
          <div className="space-y-2">
            {reviews.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{r.quarter}</span>
                <span className="text-gray-400 text-xs">{new Date(r.completedAt).toLocaleDateString("en-UG")}</span>
                {r.notes && <span className="text-gray-500 text-xs truncate max-w-xs">{r.notes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
