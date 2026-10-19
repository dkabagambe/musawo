import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { FileCheck, Award, Users, BarChart2 } from "lucide-react";

export const metadata = { title: "Principal Overview" };

export default async function PrincipalPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "content.approve")) redirect("/dashboard");

  const [totalStudents, pendingResults, pendingGraduands] = await Promise.all([
    db.enrolment.count({ where: { status: { in: ["ACTIVE", "COMPLETED", "SPONSORED"] } } }),
    db.examAttempt.count({ where: { status: "SUBMITTED", score: { not: null } } }),
    db.enrolment.count({ where: { status: "COMPLETED" } }),
  ]);

  const stats = [
    { label: "Active students",      value: totalStudents,      icon: Users },
    { label: "Results pending release", value: pendingResults,  icon: FileCheck },
    { label: "Completed enrolments", value: pendingGraduands,   icon: Award },
    { label: "Academic reports",      value: 0,                 icon: BarChart2 },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">Principal Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Academic oversight and approvals</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-primary">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="font-semibold text-lg mb-4">Quick actions</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: "Review and release exam results", href: "/principal/results" },
            { label: "Approve graduands list",           href: "/principal/graduands" },
            { label: "Approve course content",           href: "/principal/courses" },
            { label: "View academic reports",            href: "/principal/reports" },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary/30 hover:bg-surface transition-colors text-sm font-medium text-primary no-underline"
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
