import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardTabBody } from "@/components/dashboard/DashboardTabBody";
import type { DashboardTab } from "@/lib/dashboard/widgets";

export const metadata = { title: "Admin Overview" };

const ADMIN_TABS = new Set<string>([
  "general", "academics", "students", "staff", "finance", "reports", "settings", "audit",
]);

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tab = searchParams.tab;
  if (tab && tab !== "general" && ADMIN_TABS.has(tab)) {
    return (
      <DashboardTabBody
        userId={session.user.id}
        role={session.user.role}
        tab={tab as DashboardTab}
      />
    );
  }
  const canViewStudents = can(session.user.role, "students.view");
  const canViewCourses = can(session.user.role, "courses.view");
  const canViewFinance = can(session.user.role, "payments.view") || can(session.user.role, "finance.totals.view");
  const canViewPayments = can(session.user.role, "payments.view");
  const canViewReviews = can(session.user.role, "exams.mark");
  const [
    studentCount,
    courseCount,
    totalRevenue,
    pendingExamReviews,
  ] = await Promise.all([
    canViewStudents ? db.user.count({ where: { role: "STUDENT" } }) : Promise.resolve(0),
    canViewCourses ? db.course.count({ where: { status: "PUBLISHED" } }) : Promise.resolve(0),
    canViewFinance ? db.payment.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true },
    }) : Promise.resolve({ _sum: { amount: null } }),
    canViewReviews ? db.examAttempt.count({ where: { status: "SUBMITTED" } }) : Promise.resolve(0),
  ]);

  const recentPayments = canViewPayments ? await db.payment.findMany({
    where: { status: "COMPLETED" },
    orderBy: { paidAt: "desc" },
    take: 5,
    include: {
      enrolment: {
        include: {
          user: { select: { name: true } },
          course: { select: { title: true } },
        },
      },
    },
  }) : [];

  const STATS = [
    { label: "Total students", value: studentCount.toLocaleString(), href: "/admin/students" },
    { label: "Active courses", value: courseCount.toLocaleString(), href: "/admin/courses" },
    {
      label: "Revenue (UGX)",
      value: (totalRevenue._sum.amount ?? 0).toLocaleString(),
      href: "/admin/payments",
    },
    {
      label: "Exams pending review",
      value: pendingExamReviews.toLocaleString(),
      href: "/admin/courses",
    },
  ].filter((stat) => {
    if (stat.label === "Total students") return canViewStudents;
    if (stat.label === "Active courses") return canViewCourses;
    if (stat.label === "Revenue (UGX)") return canViewFinance;
    return canViewReviews;
  });

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl mb-6">Admin Overview</h1>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map((s) => (
          <Link key={s.label} href={s.href} className="card no-underline hover:shadow-md transition-shadow">
            <p className="text-2xl font-bold text-primary">{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {can(session.user.role, "courses.create") && <Link href="/admin/courses" className="btn-primary no-underline text-center">
          + New Course
        </Link>}
        {canViewStudents && <Link href="/admin/students" className="btn-secondary no-underline text-center">
          Manage Students
        </Link>}
        {can(session.user.role, "reports.view") && <Link href="/admin/reports" className="btn-outline no-underline text-center">
          View Reports
        </Link>}
      </div>

      {/* Recent payments */}
      {canViewPayments && <>
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Payments</h2>
          <Link href="/admin/payments" className="text-sm text-accent no-underline">
            View all
          </Link>
        </div>
        {recentPayments.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="pb-2 font-medium text-gray-500">Student</th>
                  <th className="pb-2 font-medium text-gray-500">Course</th>
                  <th className="pb-2 font-medium text-gray-500 text-right">Amount</th>
                  <th className="pb-2 font-medium text-gray-500 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentPayments.map((pmt) => (
                  <tr key={pmt.id}>
                    <td className="py-2">{pmt.enrolment.user.name}</td>
                    <td className="py-2 text-gray-500">{pmt.enrolment.course.title}</td>
                    <td className="py-2 text-right font-medium">
                      UGX {pmt.amount.toLocaleString()}
                    </td>
                    <td className="py-2 text-right text-gray-400">
                      {pmt.paidAt
                        ? new Date(pmt.paidAt).toLocaleDateString("en-UG")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>}
    </div>
  );
}
