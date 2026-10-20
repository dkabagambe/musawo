import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Users, BookOpen, Award, ClipboardList } from "lucide-react";
import Link from "next/link";
import PresenceOverview from "@/components/attendance/PresenceOverview";
import { DashboardTabBody } from "@/components/dashboard/DashboardTabBody";
import type { DashboardTab } from "@/lib/dashboard/widgets";

export const metadata = { title: "Academic Registrar Overview" };

const REGISTRAR_TABS = new Set<string>([
  "general", "admissions", "students", "academics", "reports",
]);

export default async function RegistrarPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.create")) redirect("/dashboard");

  const tab = searchParams.tab;
  if (tab && tab !== "general" && REGISTRAR_TABS.has(tab)) {
    return (
      <DashboardTabBody
        userId={session.user.id}
        role={session.user.role}
        tab={tab as DashboardTab}
      />
    );
  }

  const [totalStudents, activeEnrolments, completedEnrolments, pendingApplications] = await Promise.all([
    db.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    db.enrolment.count({ where: { status: "ACTIVE" } }),
    db.enrolment.count({ where: { status: "COMPLETED" } }),
    db.application.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
  ]);

  const stats = [
    { label: "Pending applications", value: pendingApplications, icon: ClipboardList, href: "/registrar/applications", highlight: pendingApplications > 0 },
    { label: "Total students",    value: totalStudents,       icon: Users,    href: "/registrar/students",    highlight: false },
    { label: "Active enrolments", value: activeEnrolments,    icon: BookOpen, href: "/registrar/enrolments",  highlight: false },
    { label: "Completed",         value: completedEnrolments, icon: Award,    href: "/registrar/graduands",   highlight: false },
  ];

  const recentStudents = await db.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true, name: true, email: true, studentNumber: true, status: true, createdAt: true,
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">Academic Registrar</h1>
        <p className="text-gray-500 text-sm mt-1">Student records, enrolments and graduands</p>
      </div>

      <PresenceOverview />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, href, highlight }) => (
          <Link key={label} href={href} className="card p-5 no-underline hover:shadow-card-hover transition-shadow block">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${highlight ? "bg-warning/15" : "bg-primary/10"}`}>
              <Icon className={`w-4 h-4 ${highlight ? "text-warning" : "text-primary"}`} aria-hidden="true" />
            </div>
            <p className={`text-2xl font-extrabold ${highlight ? "text-warning" : "text-primary"}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      <div className="card">
        <h2 className="font-semibold text-lg mb-4">Recent students</h2>
        {recentStudents.length === 0 ? (
          <p className="text-sm text-gray-500">No students yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Student number</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentStudents.map((s) => (
                  <tr key={s.id}>
                    <td className="font-medium">{s.name}</td>
                    <td className="font-mono text-xs text-gray-500">{s.studentNumber ?? "-"}</td>
                    <td className="text-gray-500">{s.email ?? "-"}</td>
                    <td>
                      <span className={`badge ${s.status === "ACTIVE" ? "badge-success" : "badge-neutral"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="text-xs text-gray-400">
                      {new Date(s.createdAt).toLocaleDateString("en-UG")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4">
          <Link href="/registrar/students" className="text-sm text-primary font-semibold no-underline hover:underline">
            View all students
          </Link>
        </div>
      </div>
    </div>
  );
}
