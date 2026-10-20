import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";
import {
  Users, BookOpen, FileCheck, Award, ChevronRight,
  AlertCircle, CheckCircle2, Clock, BarChart2,
} from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import PresenceOverview from "@/components/attendance/PresenceOverview";
import { DashboardTabBody } from "@/components/dashboard/DashboardTabBody";
import type { DashboardTab } from "@/lib/dashboard/widgets";

export const metadata = { title: "Principal Overview" };

const PRINCIPAL_TABS = new Set<string>(["general", "academics", "reports"]);

export default async function PrincipalPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "content.approve")) redirect("/dashboard");

  const tab = searchParams.tab;
  if (tab && tab !== "general" && PRINCIPAL_TABS.has(tab)) {
    return (
      <DashboardTabBody
        userId={session.user.id}
        role={session.user.role}
        tab={tab as DashboardTab}
      />
    );
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    activeStudents,
    totalEnrolments,
    completedEnrolments,
    publishedCourses,
    draftCourses,
    pendingResultsRelease,
    pendingGraduands,
    passedThisMonth,
    recentAttempts,
    upcomingClasses,
    pendingApprovals,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    db.enrolment.count({ where: { status: { in: ["ACTIVE", "PARTIALLY_PAID"] } } }),
    db.enrolment.count({ where: { status: "COMPLETED" } }),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.course.count({ where: { status: "DRAFT" } }),
    db.examAttempt.count({ where: { status: "SUBMITTED" } }),
    db.enrolment.count({ where: { status: "COMPLETED" } }),
    db.examAttempt.count({
      where: { status: "MARKED", passed: true, submittedAt: { gte: startOfMonth } },
    }),
    db.examAttempt.findMany({
      where: { status: { in: ["SUBMITTED", "MARKED"] } },
      orderBy: { submittedAt: "desc" },
      take: 8,
      include: {
        user: { select: { name: true, studentNumber: true } },
        exam: { select: { title: true, passPercent: true } },
      },
    }),
    db.liveClass.findMany({
      where: { scheduledAt: { gt: now }, status: "SCHEDULED" },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: { course: { select: { title: true } }, tutor: { select: { name: true } } },
    }),
    db.approvalRequest.count({ where: { status: "PENDING" } }),
  ]);

  const firstName = session.user.name?.split(" ")[0] ?? "Principal";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Welcome, {firstName}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {now.toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        {pendingApprovals > 0 && (
          <Link href="/director/approvals" className="flex items-center gap-2 bg-warning/10 border border-warning/30 text-amber-800 text-xs font-semibold px-3 py-2 rounded-xl no-underline hover:bg-warning/20 transition-colors">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            {pendingApprovals} pending approval{pendingApprovals !== 1 ? "s" : ""}
          </Link>
        )}
      </div>

      <PresenceOverview />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Students"   value={activeStudents}       icon={<Users className="w-5 h-5" />}     href="/principal/students"  color="primary" />
        <StatCard label="Active Enrolments" value={totalEnrolments}       icon={<BookOpen className="w-5 h-5" />}  href="/principal/students"  color="success" />
        <StatCard label="Pending Results"   value={pendingResultsRelease} icon={<FileCheck className="w-5 h-5" />} href="/principal/results"   color={pendingResultsRelease > 0 ? "warning" : "primary"} />
        <StatCard label="Graduands"         value={pendingGraduands}      icon={<Award className="w-5 h-5" />}     href="/principal/graduands" color="accent" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Published courses",   value: publishedCourses,   href: "/principal/courses" },
          { label: "Draft courses",        value: draftCourses,       href: "/principal/courses" },
          { label: "Completed this month", value: passedThisMonth,    href: "/principal/results" },
          { label: "Total graduates",      value: completedEnrolments, href: "/principal/graduands" },
        ].map(({ label, value, href }) => (
          <Link key={label} href={href} className="card p-4 no-underline group hover:shadow-card-hover transition-shadow">
            <p className="text-2xl font-extrabold text-primary group-hover:text-accent transition-colors">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent exam attempts */}
        <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-primary">Recent Exam Submissions</h2>
            <Link href="/principal/results" className="text-xs text-accent font-semibold no-underline hover:underline flex items-center gap-1">
              All results <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {recentAttempts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No submissions yet.</p>
          ) : (
            <div className="space-y-2">
              {recentAttempts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.status === "MARKED" ? (a.passed ? "bg-success/10" : "bg-danger/10") : "bg-warning/10"}`}>
                    {a.status === "MARKED"
                      ? a.passed
                        ? <CheckCircle2 className="w-4 h-4 text-success" />
                        : <AlertCircle className="w-4 h-4 text-danger" />
                      : <Clock className="w-4 h-4 text-amber-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{a.user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{a.exam.title}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    a.status === "SUBMITTED" ? "bg-warning/10 text-amber-700"
                    : a.passed ? "bg-success/10 text-success"
                    : "bg-danger/10 text-danger"}`}>
                    {a.status === "SUBMITTED" ? "Pending" : a.passed ? "Passed" : "Failed"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming classes */}
        <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-primary">Upcoming Live Classes</h2>
            <Link href="/principal/students" className="text-xs text-accent font-semibold no-underline hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {upcomingClasses.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No classes scheduled.</p>
          ) : (
            <div className="space-y-3">
              {upcomingClasses.map((cls) => {
                const d = new Date(cls.scheduledAt);
                return (
                  <div key={cls.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface">
                    <div className="w-10 h-10 bg-primary rounded-lg flex flex-col items-center justify-center text-white text-center flex-shrink-0">
                      <span className="text-[9px] font-bold uppercase leading-none">{d.toLocaleDateString("en-UG", { month: "short" })}</span>
                      <span className="text-sm font-extrabold leading-none">{d.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">{cls.title}</p>
                      <p className="text-xs text-gray-400 truncate">{cls.course.title} - {cls.tutor.name}</p>
                      <p className="text-xs text-gray-400">{d.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })} EAT</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Quick actions */}
      <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <h2 className="font-bold text-primary mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/principal/courses" className="btn-outline text-sm no-underline flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Review courses
          </Link>
          <Link href="/principal/results" className="btn-outline text-sm no-underline flex items-center gap-2">
            <FileCheck className="w-4 h-4" /> Publish results
          </Link>
          <Link href="/principal/graduands" className="btn-outline text-sm no-underline flex items-center gap-2">
            <Award className="w-4 h-4" /> Approve graduands
          </Link>
          <Link href="/principal/reports" className="btn-outline text-sm no-underline flex items-center gap-2">
            <BarChart2 className="w-4 h-4" /> Academic reports
          </Link>
        </div>
      </section>
    </div>
  );
}
