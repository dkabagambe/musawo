import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";
import { Users, Calendar, ClipboardList, BookOpen, ChevronRight, AlertCircle } from "lucide-react";
import StatCard from "@/components/ui/StatCard";

export const metadata = { title: "Deputy Principal" };

export default async function DeputyPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "support.manage")) redirect("/login");

  const now = new Date();

  const [
    activeStudents,
    totalEnrolments,
    upcomingClasses,
    supportTickets,
    suspendedStudents,
    overdueEnrolments,
    recentStudents,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    db.enrolment.count({ where: { status: { in: ["ACTIVE", "PARTIALLY_PAID"] } } }),
    db.liveClass.findMany({
      where: { scheduledAt: { gt: now }, status: "SCHEDULED" },
      orderBy: { scheduledAt: "asc" },
      take: 6,
      include: { course: { select: { title: true } }, tutor: { select: { name: true } } },
    }),
    db.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.user.count({ where: { role: "STUDENT", status: "SUSPENDED" } }),
    db.enrolment.count({ where: { status: "OVERDUE" } }),
    db.user.findMany({
      where: { role: "STUDENT", status: { in: ["ACTIVE", "PENDING_ACCEPTANCE"] } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, studentNumber: true, status: true, createdAt: true },
    }),
  ]);

  const firstName = session.user.name?.split(" ")[0] ?? "Deputy";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Welcome, {firstName}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {now.toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        {supportTickets > 0 && (
          <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 text-amber-800 text-xs font-semibold px-3 py-2 rounded-xl">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            {supportTickets} open support ticket{supportTickets !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Students"    value={activeStudents}    icon={<Users className="w-5 h-5" />}         href="/deputy/students"   color="primary" />
        <StatCard label="Active Enrolments"  value={totalEnrolments}   icon={<BookOpen className="w-5 h-5" />}      href="/deputy/students"   color="success" />
        <StatCard label="Open Support"       value={supportTickets}    icon={<ClipboardList className="w-5 h-5" />} href="/deputy/complaints" color={supportTickets > 0 ? "warning" : "primary"} />
        <StatCard label="Overdue Enrolments" value={overdueEnrolments} icon={<AlertCircle className="w-5 h-5" />}   href="/deputy/students"   color={overdueEnrolments > 0 ? "warning" : "primary"} />
      </div>

      {suspendedStudents > 0 && (
        <div className="bg-danger/5 border border-danger/20 rounded-2xl p-4 flex items-center gap-4">
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
          <p className="text-sm text-red-800 font-medium">{suspendedStudents} suspended student{suspendedStudents !== 1 ? "s" : ""} — review in the Students section.</p>
          <Link href="/deputy/students" className="ml-auto text-xs font-bold text-danger no-underline hover:underline flex-shrink-0">Review</Link>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Timetable */}
        <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-primary">Upcoming Classes</h2>
            <Link href="/deputy/timetable" className="text-xs text-accent font-semibold no-underline hover:underline flex items-center gap-1">
              Full timetable <ChevronRight className="w-3 h-3" />
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
                    <div className="w-10 h-10 bg-primary rounded-lg flex flex-col items-center justify-center text-white flex-shrink-0">
                      <span className="text-[9px] font-bold uppercase leading-none">{d.toLocaleDateString("en-UG", { month: "short" })}</span>
                      <span className="text-sm font-extrabold leading-none">{d.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">{cls.title}</p>
                      <p className="text-xs text-gray-400 truncate">{cls.course.title}</p>
                      <p className="text-xs text-gray-400">{d.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })} — {cls.tutor.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent students */}
        <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-primary">Recent Students</h2>
            <Link href="/deputy/students" className="text-xs text-accent font-semibold no-underline hover:underline flex items-center gap-1">
              All students <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {recentStudents.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No students found.</p>
          ) : (
            <div className="space-y-2">
              {recentStudents.map((s) => (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                    {s.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.studentNumber ?? "No student number"}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${s.status === "ACTIVE" ? "bg-success/10 text-success" : "bg-warning/10 text-amber-700"}`}>
                    {s.status === "ACTIVE" ? "Active" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <h2 className="font-bold text-primary mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/deputy/students"   className="btn-outline text-sm no-underline flex items-center gap-2"><Users className="w-4 h-4" /> View students</Link>
          <Link href="/deputy/timetable"  className="btn-outline text-sm no-underline flex items-center gap-2"><Calendar className="w-4 h-4" /> Timetable</Link>
          <Link href="/deputy/complaints" className="btn-outline text-sm no-underline flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Complaints</Link>
          <Link href="/deputy/policies"   className="btn-outline text-sm no-underline flex items-center gap-2"><BookOpen className="w-4 h-4" /> Policies</Link>
        </div>
      </section>
    </div>
  );
}
