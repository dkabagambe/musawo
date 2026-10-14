import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { BookOpen, Users, Video, ClipboardList, ChevronRight, AlertCircle } from "lucide-react";
import StatCard from "@/components/ui/StatCard";

export const metadata = { title: "Tutor Dashboard" };

export default async function TutorDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [courses, upcomingClasses, pendingReviews, recentStudents] = await Promise.all([
    db.course.findMany({
      where: { tutorId: session.user.id },
      include: { _count: { select: { enrolments: true } } },
    }),
    db.liveClass.findMany({
      where: { tutorId: session.user.id, scheduledAt: { gt: new Date() }, status: "SCHEDULED" },
      orderBy: { scheduledAt: "asc" },
      take: 4,
      include: { course: { select: { title: true } } },
    }),
    db.examAttempt.count({
      where: { status: "SUBMITTED", exam: { course: { tutorId: session.user.id } } },
    }),
    db.enrolment.findMany({
      where: { status: { in: ["ACTIVE","COMPLETED"] }, course: { tutorId: session.user.id } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: { select: { name: true, studentNumber: true } }, course: { select: { title: true } } },
    }),
  ]);

  const enrolledTotal = courses.reduce((s, c) => s + c._count.enrolments, 0);
  const firstName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">Welcome, {firstName}!</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Pending reviews alert */}
      {pendingReviews > 0 && (
        <div className="bg-warning/5 border border-warning/25 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-warning/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-amber-800">Short-answer reviews pending</p>
            <p className="text-xs text-amber-700 mt-0.5">{pendingReviews} exam submission{pendingReviews !== 1 ? "s" : ""} await your review and marking.</p>
          </div>
          <Link href="/tutor/exams" className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-xl no-underline transition-colors flex-shrink-0">
            Review now
          </Link>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Courses"       value={courses.length}   icon={<BookOpen className="w-5 h-5" />}     href="/tutor/courses"  color="primary" />
        <StatCard label="Total Students"   value={enrolledTotal}    icon={<Users className="w-5 h-5" />}        href="/tutor/students" color="success" />
        <StatCard label="Upcoming Classes" value={upcomingClasses.length} icon={<Video className="w-5 h-5" />} href="/tutor/classes"  color="accent"  />
        <StatCard label="Pending Reviews"  value={pendingReviews}   icon={<ClipboardList className="w-5 h-5" />} href="/tutor/exams" color={pendingReviews > 0 ? "warning" : "primary"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Upcoming classes */}
        <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-primary">Upcoming Classes</h2>
            <Link href="/tutor/classes" className="text-xs text-accent font-semibold no-underline hover:underline flex items-center gap-1">
              All classes <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {upcomingClasses.length === 0 ? (
            <div className="text-center py-6">
              <Video className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No upcoming classes scheduled.</p>
              <Link href="/tutor/classes" className="text-xs text-accent font-semibold no-underline hover:underline mt-2 inline-block">
                + Schedule a class
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingClasses.map((cls) => {
                const date = new Date(cls.scheduledAt);
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <div key={cls.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface">
                    <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 text-white text-center ${isToday ? "bg-accent" : "bg-primary"}`}>
                      <span className="text-[9px] font-bold uppercase leading-none">{date.toLocaleDateString("en-UG", { month: "short" })}</span>
                      <span className="text-sm font-extrabold leading-none">{date.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">{cls.title}</p>
                      <p className="text-xs text-gray-400 truncate">{cls.course.title}</p>
                      <p className="text-xs text-gray-400">{date.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })} EAT</p>
                    </div>
                    <a href={cls.joinUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-bold text-primary border border-primary/30 px-3 py-1.5 rounded-lg no-underline hover:bg-primary hover:text-white transition-colors flex-shrink-0">
                      Join
                    </a>
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
            <Link href="/tutor/students" className="text-xs text-accent font-semibold no-underline hover:underline flex items-center gap-1">
              All students <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {recentStudents.length === 0 ? (
            <div className="text-center py-6">
              <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No students enrolled yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentStudents.map((enr) => (
                <div key={enr.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {enr.user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{enr.user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{enr.user.studentNumber ?? enr.course.title}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${enr.status === "COMPLETED" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                    {enr.status === "COMPLETED" ? "Done" : "Active"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* My courses */}
      {courses.length > 0 && (
        <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-primary">My Courses</h2>
            <Link href="/tutor/courses" className="text-xs text-accent font-semibold no-underline hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {courses.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-surface transition-colors">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary leading-snug truncate">{c.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c._count.enrolments} students enrolled</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${c.status === "PUBLISHED" ? "bg-success/10 text-success" : "bg-gray-100 text-gray-500"}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
