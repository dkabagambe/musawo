import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { getAccessLevel, getStepperState, enrolmentStatusLabel } from "@/lib/enrolment/access";
import {
  BookOpen, Bell, Video, CheckCircle2, Clock,
  AlertTriangle, ArrowRight, ChevronRight,
} from "lucide-react";

export const metadata = { title: "Dashboard" };

const STEPPER_STEPS = [
  { key: "registered",  label: "Registered" },
  { key: "paid",        label: "Paid" },
  { key: "learning",    label: "Learning" },
  { key: "exams",       label: "Exams" },
  { key: "certificate", label: "Certified" },
] as const;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [enrolments, upcomingClasses, unreadNotifs, announcements] = await Promise.all([
    db.enrolment.findMany({
      where: { userId: session.user.id },
      include: {
        course: {
          select: {
            title: true, slug: true, thumbnailUrl: true, durationWeeks: true,
            blocks: { select: { _count: { select: { lessons: true } } } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    db.liveClass.findMany({
      where: {
        scheduledAt: { gt: new Date() },
        status: "SCHEDULED",
        course: { enrolments: { some: { userId: session.user.id, status: { in: ["ACTIVE","PARTIALLY_PAID","SPONSORED","COMPLETED"] } } } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 3,
      select: { id: true, title: true, scheduledAt: true, joinUrl: true, durationMin: true, course: { select: { title: true } } },
    }),
    db.notification.count({ where: { userId: session.user.id, readAt: null } }),
    db.announcement.findMany({
      where: { OR: [{ courseId: null }, { course: { enrolments: { some: { userId: session.user.id } } } }] },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 3,
      select: { id: true, title: true, body: true, pinned: true, createdAt: true },
    }),
  ]);

  const activeEnrolments = enrolments.filter((e) => {
    const level = getAccessLevel({ status: e.status, paidPercent: e.paidPercent, unlockedBlockOrder: e.unlockedBlockOrder, provisionalUntil: null, graceUntil: null, overdueSince: null });
    return level !== "NONE" && level !== "PENDING";
  });
  const pendingEnrolments = enrolments.filter((e) => e.status === "PENDING_PAYMENT");
  const overdueEnrolments = enrolments.filter((e) => e.status === "OVERDUE");

  const firstActive = activeEnrolments[0];
  let stepperState = null;
  let lessonCount = 0;
  let completedCount = 0;

  if (firstActive) {
    const [completedLessons, passedExam, cert] = await Promise.all([
      db.lessonProgress.count({ where: { userId: session.user.id, completedAt: { not: null }, lesson: { block: { courseId: firstActive.courseId } } } }),
      db.examAttempt.count({ where: { userId: session.user.id, passed: true, exam: { courseId: firstActive.courseId } } }),
      db.certificate.count({ where: { userId: session.user.id, courseId: firstActive.courseId, revokedAt: null } }),
    ]);
    lessonCount = firstActive.course.blocks.reduce((s, b) => s + b._count.lessons, 0);
    completedCount = completedLessons;
    const accessInfo = { status: firstActive.status, paidPercent: firstActive.paidPercent, unlockedBlockOrder: firstActive.unlockedBlockOrder, provisionalUntil: null, graceUntil: null, overdueSince: null };
    stepperState = getStepperState(accessInfo, completedLessons > 0, passedExam > 0, cert > 0);
  }

  const progressPct = lessonCount > 0 ? Math.round((completedCount / lessonCount) * 100) : 0;
  const firstName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Welcome */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Welcome back, {firstName}!</h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        {unreadNotifs > 0 && (
          <Link href="/dashboard/notifications" className="relative no-underline flex-shrink-0">
            <div className="w-10 h-10 bg-white rounded-xl border border-border flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
              <Bell className="w-5 h-5 text-gray-500" />
            </div>
            <span className="absolute -top-1.5 -right-1.5 bg-danger text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {unreadNotifs > 9 ? "9+" : unreadNotifs}
            </span>
          </Link>
        )}
      </div>

      {/* Alert banners */}
      {overdueEnrolments.map((e) => (
        <div key={e.id} className="bg-danger/5 border border-danger/20 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-danger/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-danger text-sm">Overdue payment — {e.course.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">You have missed an instalment. Pay now to keep your access.</p>
          </div>
          <Link href="/dashboard/payments" className="btn-primary text-xs px-4 py-2 no-underline flex-shrink-0">Pay now</Link>
        </div>
      ))}

      {pendingEnrolments.map((e) => (
        <div key={e.id} className="bg-accent/5 border border-accent/20 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{e.course.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">Complete your payment to unlock course access.</p>
          </div>
          <Link href="/dashboard/payments" className="btn-primary text-xs px-4 py-2 no-underline flex-shrink-0 flex items-center gap-1">
            Pay now <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ))}

      {/* Progress stepper */}
      {stepperState && firstActive && (
        <div className="bg-white rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your progress</p>
              <p className="font-bold text-primary mt-0.5 text-sm truncate max-w-xs">{firstActive.course.title}</p>
            </div>
            <Link href={`/dashboard/courses/${firstActive.course.slug}`} className="text-xs text-accent font-semibold no-underline hover:underline flex items-center gap-1">
              Continue <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <ol className="flex items-center" role="list">
            {STEPPER_STEPS.map(({ key, label }, i) => {
              const state = stepperState![key];
              const isLast = i === STEPPER_STEPS.length - 1;
              return (
                <li key={key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all
                      ${state === "done"   ? "bg-success border-success text-white"
                      : state === "active" ? "bg-white border-accent text-accent shadow-[0_0_0_3px_rgba(242,163,46,0.15)]"
                      :                     "bg-white border-border text-gray-300"}`}>
                      {state === "done" ? <CheckCircle2 className="w-4 h-4" /> : <span>{i + 1}</span>}
                    </div>
                    <span className={`text-[10px] mt-1.5 font-medium text-center whitespace-nowrap
                      ${state === "done" ? "text-success" : state === "active" ? "text-accent" : "text-gray-400"}`}>
                      {label}
                    </span>
                  </div>
                  {!isLast && (
                    <div className={`flex-1 h-0.5 mx-1 mb-4 ${state === "done" ? "bg-success" : "bg-border"}`} aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ol>
          {lessonCount > 0 && (
            <div className="mt-5 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span>{completedCount} of {lessonCount} lessons completed</span>
                <span className="font-semibold text-primary">{progressPct}%</span>
              </div>
              <div className="w-full bg-surface rounded-full h-2">
                <div className="bg-success h-2 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }}
                  role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* Active courses */}
          {activeEnrolments.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-primary">My Courses</h2>
                <Link href="/dashboard/courses" className="text-xs text-accent font-semibold no-underline hover:underline flex items-center gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {activeEnrolments.map((enr) => {
                  const total = enr.course.blocks.reduce((s, b) => s + b._count.lessons, 0);
                  return (
                    <Link key={enr.id} href={`/dashboard/courses/${enr.course.slug}`}
                      className="bg-white rounded-2xl border border-border p-4 flex items-center gap-4 no-underline hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group">
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-primary/10">
                        {enr.course.thumbnailUrl
                          ? <Image src={enr.course.thumbnailUrl} alt={enr.course.title} fill className="object-cover" sizes="56px" />
                          : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-6 h-6 text-primary/40" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-primary leading-snug truncate group-hover:text-accent transition-colors">{enr.course.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-400">{total} lessons</span>
                          {enr.course.durationWeeks && <span className="text-xs text-gray-400">· {enr.course.durationWeeks}w</span>}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            enr.status === "ACTIVE"    ? "bg-success/10 text-success" :
                            enr.status === "COMPLETED" ? "bg-primary/10 text-primary" :
                            enr.status === "SPONSORED" ? "bg-accent/10 text-accent"   :
                                                         "bg-gray-100 text-gray-500"}`}>
                            {enrolmentStatusLabel(enr.status)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors flex-shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Upcoming classes */}
          {upcomingClasses.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-primary">Upcoming Live Classes</h2>
                <Link href="/dashboard/timetable" className="text-xs text-accent font-semibold no-underline hover:underline flex items-center gap-1">
                  Full timetable <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {upcomingClasses.map((cls) => {
                  const date = new Date(cls.scheduledAt);
                  const isToday = date.toDateString() === new Date().toDateString();
                  return (
                    <div key={cls.id} className="bg-white rounded-2xl border border-border p-4 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-white ${isToday ? "bg-accent" : "bg-primary"}`}>
                        <span className="text-[10px] font-bold uppercase leading-none">{date.toLocaleDateString("en-UG", { month: "short" })}</span>
                        <span className="text-lg font-extrabold leading-tight">{date.getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-primary leading-snug">{cls.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{cls.course.title} · {cls.durationMin} min</p>
                        <p className="text-xs text-gray-400">{date.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })} EAT</p>
                      </div>
                      <a href={cls.joinUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold px-4 py-2 rounded-xl no-underline transition-colors flex-shrink-0">
                        <Video className="w-3.5 h-3.5" /> Join
                      </a>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Empty state */}
          {enrolments.length === 0 && (
            <div className="bg-white rounded-2xl border border-border p-10 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-primary/40" />
              </div>
              <h2 className="text-lg font-bold text-primary mb-2">Start your journey</h2>
              <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">Browse our accredited healthcare courses and enrol today.</p>
              <Link href="/courses" className="btn-primary no-underline inline-flex items-center gap-2">
                Browse courses <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {announcements.length > 0 && (
            <section>
              <h2 className="font-bold text-primary mb-3">Announcements</h2>
              <div className="space-y-3">
                {announcements.map((a) => (
                  <div key={a.id} className={`bg-white rounded-2xl border p-4 ${a.pinned ? "border-accent/40" : "border-border"}`}>
                    {a.pinned && <span className="text-[10px] font-bold text-accent uppercase tracking-wider">📌 Pinned</span>}
                    <p className="font-semibold text-sm text-primary mt-0.5 leading-snug">{a.title}</p>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-3">{a.body}</p>
                    <p className="text-[10px] text-gray-400 mt-2">
                      {new Date(a.createdAt).toLocaleDateString("en-UG", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="font-bold text-primary mb-3">Quick Links</h2>
            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              {[
                { href: "/dashboard/results",     label: "My results",      icon: "📋" },
                { href: "/dashboard/certificates", label: "Certificates",    icon: "🎓" },
                { href: "/dashboard/support",      label: "Get support",     icon: "💬" },
                { href: "/dashboard/profile",      label: "Edit profile",    icon: "👤" },
              ].map((l, i, arr) => (
                <Link key={l.href} href={l.href}
                  className={`flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-surface hover:text-primary no-underline transition-colors ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                  <span className="w-7 h-7 bg-surface rounded-lg flex items-center justify-center text-base">{l.icon}</span>
                  <span className="flex-1">{l.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
