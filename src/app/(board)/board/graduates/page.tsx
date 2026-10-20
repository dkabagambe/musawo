import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Award } from "lucide-react";

export const metadata = { title: "Graduates - Board" };

interface Props { searchParams: { q?: string; year?: string; course?: string } }

export default async function BoardGraduatesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "reports.board")) redirect("/login");

  const q = searchParams.q?.trim() ?? "";
  const yearFilter = searchParams.year ? Number(searchParams.year) : null;

  const enrolments = await db.enrolment.findMany({
    where: { status: "COMPLETED" },
    orderBy: { updatedAt: "desc" },
    include: {
      user:   { select: { name: true } },
      course: { select: { title: true } },
    },
  });

  const filtered = enrolments.filter((e) => {
    if (q && !e.user.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (yearFilter && new Date(e.updatedAt).getFullYear() !== yearFilter) return false;
    return true;
  });

  const years = Array.from(new Set(enrolments.map((e) => new Date(e.updatedAt).getFullYear()))).sort((a, b) => b - a);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Graduates</h1>
        <p className="text-gray-500 text-sm mt-1">Names, course and year only - Board view</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input name="q" type="search" defaultValue={q}
          onChange={(e) => {}} placeholder="Search by name..."
          className="input max-w-xs text-sm" readOnly />
        <form method="GET" className="flex gap-2">
          <select name="year" defaultValue={yearFilter ?? ""} className="input text-sm w-auto">
            <option value="">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="submit" className="btn-primary text-sm">Filter</button>
          {(q || yearFilter) && <a href="/board/graduates" className="btn-ghost text-sm no-underline">Clear</a>}
        </form>
      </div>

      <p className="text-sm text-gray-500">{filtered.length} graduate{filtered.length !== 1 ? "s" : ""}</p>

      <div className="card overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="py-10 text-center">
            <Award className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No graduates found.</p>
          </div>
        ) : (
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">#</th>
                <th className="pb-2 font-medium pr-4">Name</th>
                <th className="pb-2 font-medium pr-4">Course</th>
                <th className="pb-2 font-medium">Year</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((e, i) => (
                <tr key={e.id} className="hover:bg-surface/50">
                  <td className="py-2.5 pr-4 text-xs text-gray-400">{i + 1}</td>
                  <td className="py-2.5 pr-4 font-medium text-primary">{e.user.name}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{e.course.title}</td>
                  <td className="py-2.5 text-gray-500">{new Date(e.updatedAt).getFullYear()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
