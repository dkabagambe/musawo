import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { BarChart2, Users, BookOpen, Award } from "lucide-react";

export const metadata = { title: "Reports - Deputy Principal" };

export default async function DeputyReportsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "reports.academic")) redirect("/login");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    activeStudents, totalEnrolments, completedEnrolments,
    newStudentsThisMonth, overdueEnrolments, suspendedStudents,
    enrolmentsByCourse,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    db.enrolment.count({ where: { status: { in: ["ACTIVE","PARTIALLY_PAID"] } } }),
    db.enrolment.count({ where: { status: "COMPLETED" } }),
    db.user.count({ where: { role: "STUDENT", createdAt: { gte: startOfMonth } } }),
    db.enrolment.count({ where: { status: "OVERDUE" } }),
    db.user.count({ where: { role: "STUDENT", status: "SUSPENDED" } }),
    db.enrolment.groupBy({
      by: ["courseId"], _count: true,
      where: { status: { in: ["ACTIVE","PARTIALLY_PAID","COMPLETED"] } },
      orderBy: { _count: { courseId: "desc" } },
      take: 7,
    }),
  ]);

  const courseIds = enrolmentsByCourse.map((e) => e.courseId);
  const courseNames = await db.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } });
  const courseMap = Object.fromEntries(courseNames.map((c) => [c.id, c.title]));

  const stats = [
    { label: "Active students",      value: activeStudents,       icon: Users,    color: "text-primary" },
    { label: "Active enrolments",    value: totalEnrolments,       icon: BookOpen, color: "text-success" },
    { label: "New students (month)", value: newStudentsThisMonth,  icon: Users,    color: "text-accent" },
    { label: "Graduates",            value: completedEnrolments,   icon: Award,    color: "text-primary" },
    { label: "Overdue enrolments",   value: overdueEnrolments,     icon: BarChart2, color: overdueEnrolments > 0 ? "text-danger" : "text-gray-400" },
    { label: "Suspended",            value: suspendedStudents,     icon: Users,    color: suspendedStudents > 0 ? "text-danger" : "text-gray-400" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Academic Reports</h1>
        <p className="text-gray-500 text-sm mt-1">Summary as of {now.toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-gray-50`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-2xl font-extrabold text-primary">{value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <section className="card p-5">
        <h2 className="font-bold text-primary mb-4">Enrolments by Course</h2>
        <div className="space-y-3">
          {enrolmentsByCourse.map((e) => (
            <div key={e.courseId}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-gray-700 truncate max-w-xs">{courseMap[e.courseId] ?? e.courseId}</span>
                <span className="text-gray-400 flex-shrink-0 ml-2">{e._count} enrolled</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (e._count / Math.max(activeStudents, 1)) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
