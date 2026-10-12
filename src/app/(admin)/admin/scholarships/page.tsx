import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "Scholarships & Discounts — Admin" };

export default async function AdminScholarshipsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const codes = await db.discountCode.findMany({
    orderBy: { createdAt: "desc" },
  });

  const courses = await db.course.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, title: true },
  });

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl mb-6">Scholarships &amp; Discount Codes</h1>

      {/* Create form */}
      <div className="card mb-8">
        <h2 className="font-semibold mb-4">Create new code</h2>
        <form action="/api/admin/scholarships" method="POST" className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="code">Code</label>
            <input id="code" name="code" type="text" required className="input" placeholder="SCHOLAR2026" />
          </div>
          <div>
            <label className="label" htmlFor="type">Type</label>
            <select id="type" name="type" className="input" required>
              <option value="SCHOLARSHIP">Scholarship (100% off)</option>
              <option value="PERCENTAGE">Percentage discount</option>
              <option value="FIXED_AMOUNT">Fixed amount (UGX)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="value">Value</label>
            <input id="value" name="value" type="number" min="0" className="input" placeholder="e.g. 20 for 20%" />
          </div>
          <div>
            <label className="label" htmlFor="maxUses">Max uses (blank = unlimited)</label>
            <input id="maxUses" name="maxUses" type="number" min="1" className="input" placeholder="e.g. 10" />
          </div>
          <div>
            <label className="label" htmlFor="courseId">Restrict to course (optional)</label>
            <select id="courseId" name="courseId" className="input">
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="expiresAt">Expiry date (optional)</label>
            <input id="expiresAt" name="expiresAt" type="date" className="input" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">Create code</button>
          </div>
        </form>
      </div>

      {/* Existing codes */}
      <div className="card overflow-x-auto">
        <h2 className="font-semibold mb-4">Existing codes ({codes.length})</h2>
        {codes.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No codes yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Code</th>
                <th className="pb-2 font-medium pr-4">Type</th>
                <th className="pb-2 font-medium pr-4">Value</th>
                <th className="pb-2 font-medium pr-4 text-center">Uses</th>
                <th className="pb-2 font-medium pr-4">Expires</th>
                <th className="pb-2 font-medium">Course</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {codes.map((c) => (
                <tr key={c.id}>
                  <td className="py-2 pr-4 font-mono font-bold text-primary">{c.code}</td>
                  <td className="py-2 pr-4">
                    <span className={`badge text-xs ${
                      c.type === "SCHOLARSHIP" ? "badge-success" :
                      c.type === "PERCENTAGE" ? "badge-info" : "badge-warning"
                    }`}>
                      {c.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    {c.type === "PERCENTAGE" ? `${c.value}%` :
                     c.type === "FIXED_AMOUNT" ? `UGX ${c.value.toLocaleString()}` :
                     "Full"}
                  </td>
                  <td className="py-2 pr-4 text-center">
                    {c.uses}{c.maxUses ? `/${c.maxUses}` : ""}
                  </td>
                  <td className="py-2 pr-4 text-gray-400 text-xs">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-UG") : "Never"}
                  </td>
                  <td className="py-2 text-gray-400 text-xs">
                    {c.courseId ?? "All"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
