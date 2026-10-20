import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { BarChart2, Users, Award, TrendingUp } from "lucide-react";

export const metadata = { title: "Reports - Auditor" };

export default async function AuditorReportsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "audit.view")) redirect("/login");

  await audit({ actorId: session.user.id, action: "LOGIN", entityType: "AuditorReportsView", entityId: "reports", metadata: { event: "auditor_reports_view" } });

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [
    totalStudents, activeEnrolments, completedEnrolments, totalPayments,
    yearRevenue, enrolmentsByCourse,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.enrolment.count({ where: { status: { in: ["ACTIVE","PARTIALLY_PAID"] } } }),
    db.enrolment.count({ where: { status: "COMPLETED" } }),
    db.payment.count({ where: { status: "COMPLETED" } }),
    db.payment.aggregate({ where: { status: "COMPLETED", paidAt: { gte: startOfYear } }, _sum: { amount: true } }),
    db.course.findMany({
      where: { status: "PUBLISHED" },
      select: { title: true, slug: true, _count: { select: { enrolments: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const fmtUGX = (n: number) => `UGX ${Math.round(n).toLocaleString()}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Reports</h1>
        <p className="text-gray-500 text-sm mt-1">Read-only financial and academic summary. All views are logged.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total students",    value: totalStudents.toLocaleString(),                     icon: Users,    color: "bg-primary/10 text-primary" },
          { label: "Active enrolments", value: activeEnrolments.toLocaleString(),                  icon: BarChart2, color: "bg-success/10 text-success" },
          { label: "Graduates",         value: completedEnrolments.toLocaleString(),               icon: Award,    color: "bg-accent/10 text-accent" },
          { label: "Revenue this year", value: fmtUGX(yearRevenue._sum.amount ?? 0),              icon: TrendingUp, color: "bg-primary/10 text-primary" },
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
        <h2 className="font-bold text-primary mb-4">Enrolments by Programme</h2>
        <div className="space-y-3">
          {enrolmentsByCourse.map((c) => (
            <div key={c.slug}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-gray-700 truncate max-w-sm">{c.title}</span>
                <span className="text-gray-400 ml-2 flex-shrink-0">{c._count.enrolments} enrolled</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (c._count.enrolments / Math.max(totalStudents, 1)) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-bold text-primary mb-2">Payments</h2>
        <p className="text-sm text-gray-600">{totalPayments.toLocaleString()} verified payments on record.</p>
        <p className="text-sm text-gray-600 mt-1">Total revenue this year: <strong>{fmtUGX(yearRevenue._sum.amount ?? 0)}</strong></p>
      </section>
    </div>
  );
}
