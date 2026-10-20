import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { BarChart2, TrendingUp, Users, Award } from "lucide-react";

export const metadata = { title: "Reports - Board" };

export default async function BoardReportsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "reports.board")) redirect("/login");

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  const [
    totalStudents, activeEnrolments, completedEnrolments, publishedCourses,
    yearRevenue, enrolmentsByCourse,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.enrolment.count({ where: { status: { in: ["ACTIVE","PARTIALLY_PAID"] } } }),
    db.enrolment.count({ where: { status: "COMPLETED" } }),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.payment.aggregate({ where: { status: "COMPLETED", paidAt: { gte: startOfYear } }, _sum: { amount: true } }),
    db.course.findMany({
      where: { status: "PUBLISHED" },
      select: { title: true, slug: true, category: true, _count: { select: { enrolments: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const fmtUGX = (n: number) => `UGX ${Math.round(n).toLocaleString()}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Board Reports</h1>
        <p className="text-gray-500 text-sm mt-1">Aggregated institutional performance - read-only</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total students",    value: totalStudents.toLocaleString(),      icon: Users,    color: "bg-primary/10 text-primary" },
          { label: "Active enrolments", value: activeEnrolments.toLocaleString(),   icon: BarChart2, color: "bg-success/10 text-success" },
          { label: "Graduates",         value: completedEnrolments.toLocaleString(), icon: Award,    color: "bg-accent/10 text-accent" },
          { label: "Revenue this year", value: fmtUGX(yearRevenue._sum.amount ?? 0), icon: TrendingUp, color: "bg-primary/10 text-primary" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-extrabold text-primary">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <section className="card p-5">
        <h2 className="font-bold text-primary mb-4">Enrolments by Programme ({now.getFullYear()})</h2>
        <div className="space-y-3">
          {enrolmentsByCourse.map((c) => (
            <div key={c.slug}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-gray-700 truncate max-w-sm">{c.title}</span>
                <span className="text-gray-400 ml-2 flex-shrink-0">{c._count.enrolments} enrolled</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (c._count.enrolments / Math.max(activeEnrolments, 1)) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-bold text-primary mb-2">Courses offered</h2>
        <p className="text-sm text-gray-500">{publishedCourses} programmes published for November 2026 intake.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {enrolmentsByCourse.map((c) => (
            <span key={c.slug} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.category === "PROFESSIONAL" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"}`}>
              {c.title.length > 40 ? c.title.substring(0, 38) + "..." : c.title}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
