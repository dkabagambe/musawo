import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";
import { Users, BookOpen, Award, TrendingUp, ChevronRight } from "lucide-react";

export const metadata = { title: "Board Overview" };

export default async function BoardPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "reports.board")) redirect("/login");

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalStudents,
    activeEnrolments,
    completedEnrolments,
    publishedCourses,
    monthRevenue,
    yearRevenue,
    recentGraduates,
    courseStats,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.enrolment.count({ where: { status: { in: ["ACTIVE", "PARTIALLY_PAID"] } } }),
    db.enrolment.count({ where: { status: "COMPLETED" } }),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.payment.aggregate({ where: { status: "COMPLETED", paidAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { status: "COMPLETED", paidAt: { gte: startOfYear } }, _sum: { amount: true } }),
    db.enrolment.findMany({
      where: { status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        user: { select: { name: true } },
        course: { select: { title: true } },
      },
    }),
    db.course.findMany({
      where: { status: "PUBLISHED" },
      select: {
        title: true, slug: true, category: true,
        _count: { select: { enrolments: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const fmtUGX = (n: number) =>
    `UGX ${Math.round(n).toLocaleString()}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Board Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Aggregated institutional performance — read-only</p>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total students",      value: totalStudents,       icon: Users,    color: "bg-primary/10 text-primary" },
          { label: "Active enrolments",   value: activeEnrolments,    icon: BookOpen, color: "bg-success/10 text-success" },
          { label: "Graduates",           value: completedEnrolments, icon: Award,    color: "bg-accent/10 text-accent" },
          { label: "Courses offered",     value: publishedCourses,    icon: BookOpen, color: "bg-primary/10 text-primary" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-4 h-4" aria-hidden="true" />
            </div>
            <p className="text-2xl font-extrabold text-primary">{value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Revenue summary */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-primary">
              {fmtUGX(monthRevenue._sum.amount ?? 0)}
            </p>
            <p className="text-xs text-gray-400">Revenue this month</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-primary">
              {fmtUGX(yearRevenue._sum.amount ?? 0)}
            </p>
            <p className="text-xs text-gray-400">Revenue this year ({now.getFullYear()})</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Enrolments per course */}
        <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <h2 className="font-bold text-primary mb-4">Enrolments per Course</h2>
          <div className="space-y-3">
            {courseStats.map((c) => {
              const pct = totalStudents > 0 ? Math.round((c._count.enrolments / Math.max(totalStudents, 1)) * 100) : 0;
              return (
                <div key={c.slug}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700 truncate max-w-[200px]">{c.title}</span>
                    <span className="text-gray-400 flex-shrink-0 ml-2">{c._count.enrolments} enrolled</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent graduates */}
        <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-primary">Recent Graduates</h2>
            <Link href="/board/graduates" className="text-xs text-accent font-semibold no-underline hover:underline flex items-center gap-1">
              All graduates <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {recentGraduates.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No graduates yet.</p>
          ) : (
            <div className="space-y-2">
              {recentGraduates.map((e) => (
                <div key={e.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center text-success text-xs font-bold flex-shrink-0">
                    {e.user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{e.user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{e.course.title}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(e.updatedAt).getFullYear()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
