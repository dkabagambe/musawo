import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { getAccessLevel, getStepperState, enrolmentStatusLabel } from "@/lib/enrolment/access";

export const metadata = { title: "Dashboard" };

const STEPPER_STEPS = [
  { key: "registered",   label: "Registered",  icon: "👤" },
  { key: "paid",         label: "Paid",         icon: "💳" },
  { key: "learning",     label: "Learning",     icon: "📚" },
  { key: "exams",        label: "Exams",        icon: "📝" },
  { key: "certificate",  label: "Certificate",  icon: "🎓" },
] as const;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [enrolments, upcomingClasses, unreadNotifs] = await Promise.all([
    db.enrolment.findMany({
      where: { userId: session.user.id },
      include: {
        course: {
          select: {
            title: true, slug: true, thumbnailUrl: true,
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
        course: { enrolments: { some: { userId: session.user.id, status: { in: ["ACTIVE", "PARTIALLY_PAID", "SPONSORED", "COMPLETED"] } } } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 3,
      select: { id: true, title: true, scheduledAt: true, joinUrl: true, course: { select: { title: true } } },
    }),
    db.notification.count({ where: { userId: session.user.id, readAt: null } }),
  ]);

  const activeEnrolments = enrolments.filter((e) => {
    const level = getAccessLevel({ status: e.status, unlockedBlockOrder: e.unlockedBlockOrder, provisionalUntil: null, graceUntil: null, overdueSince: null });
    return level !== "NONE" && level !== "PENDING";
  });
  const pendingEnrolments = enrolments.filter((e) => e.status === "PENDING_PAYMENT");

  // For the first active enrolment, get stepper state
  const firstActive = activeEnrolments[0];
  let stepperState = null;
  if (firstActive) {
    const [completedLessons, passedExam, cert] = await Promise.all([
      db.lessonProgress.count({ where: { userId: session.user.id, completedAt: { not: null }, lesson: { block: { courseId: firstActive.courseId } } } }),
      db.examAttempt.count({ where: { userId: session.user.id, passed: true, exam: { courseId: firstActive.courseId } } }),
      db.certificate.count({ where: { userId: session.user.id, courseId: firstActive.courseId, revokedAt: null } }),
    ]);
    const accessInfo = { status: firstActive.status, unlockedBlockOrder: firstActive.unlockedBlockOrder, provisionalUntil: null, graceUntil: null, overdueSince: null };
    stepperState = getStepperState(accessInfo, completedLessons > 0, passedExam > 0, cert > 0);
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl">Welcome back, {session.user.name.split(" ")[0]}!</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        {unreadNotifs > 0 && (
          <Link href="/dashboard/notifications" className="relative no-underline" aria-label={`${unreadNotifs} unread notifications`}>
            <span className="text-2xl" aria-hidden="true">🔔</span>
            <span className="absolute -top-1 -right-1 bg-danger text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {unreadNotifs > 9 ? "9+" : unreadNotifs}
            </span>
          </Link>
        )}
      </div>

      {/* Progress stepper for first active enrolment */}
      {stepperState && firstActive && (
        <section className="card mb-6" aria-label="Your learning progress">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-4 font-medium">{firstActive.course.title}</p>
          <ol className="flex items-center justify-between gap-1" role="list">
            {STEPPER_STEPS.map(({ key, label, icon }, i) => {
              const state = stepperState![key];
              return (
                <li key={key} className="flex flex-col items-center flex-1 relative">
                  {i > 0 && (
                    <div className={`absolute left-0 right-1/2 top-4 h-0.5 -translate-y-1/2 ${
                      state === "done" ? "bg-success" : "bg-border"
                    }`} aria-hidden="true" />
                  )}
                  <span className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                    state === "done"   ? "bg-success border-success text-white" :
                    state === "active" ? "bg-white border-accent text-accent" :
                                        "bg-white border-border text-gray-300"
                  }`} aria-label={`${label}: ${state}`}>
                    {state === "done" ? "✓" : icon}
                  </span>
                  <span className={`text-xs mt-1.5 text-center leading-tight ${
                    state === "done" ? "text-success font-medium" :
                    state === "active" ? "text-accent font-medium" : "text-gray-400"
                  }`}>
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Overdue / pending banners */}
      {enrolments.filter(e => e.status === "OVERDUE").map(e => (
        <div key={e.id} className="bg-danger/10 border border-danger/20 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-danger text-sm">⚠️ Overdue payment — {e.course.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">You have missed an instalment. Pay now to keep your access.</p>
          </div>
          <Link href={`/courses/${e.course.slug}`} className="btn-primary text-xs px-4 py-1.5 no-underline flex-shrink-0">Pay now</Link>
        </div>
      ))}

      {/* Pending payment cards */}
      {pendingEnrolments.length > 0 && (
        <section className="mb-6">
          <h2 className="text-base font-semibold mb-3">Complete your enrolment</h2>
          {pendingEnrolments.map((e) => (
            <div key={e.id} className="card border-accent/30 bg-accent/5 mb-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm">{e.course.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{enrolmentStatusLabel(e.status)}</p>
                </div>
                <Link href={`/courses/${e.course.slug}`} className="btn-primary text-xs no-underline flex-shrink-0">
                  Pay now
                </Link>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Active courses */}
      {activeEnrolments.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">My Courses</h2>
            <Link href="/dashboard/courses" className="text-sm text-accent no-underline">View all</Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {activeEnrolments.map((enr) => (
              <Link key={enr.id} href={`/dashboard/courses/${enr.course.slug}`}
                className="card flex gap-4 items-start hover:shadow-md transition-shadow no-underline">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">📚</div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-primary truncate">{enr.course.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{enrolmentStatusLabel(enr.status)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming classes */}
      {upcomingClasses.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Upcoming Live Classes</h2>
          <div className="space-y-3">
            {upcomingClasses.map((cls) => (
              <div key={cls.id} className="card flex items-center gap-4">
                <span className="text-2xl" aria-hidden="true">📹</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{cls.title}</p>
                  <p className="text-xs text-gray-400">{cls.course.title}</p>
                  <p className="text-xs text-gray-400">{new Date(cls.scheduledAt).toLocaleString("en-UG")}</p>
                </div>
                <a href={cls.joinUrl} target="_blank" rel="noopener noreferrer"
                  className="btn-primary text-xs px-4 py-1.5 no-underline flex-shrink-0">Join</a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {enrolments.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-4xl mb-4" aria-hidden="true">🎓</p>
          <h2 className="text-lg font-semibold mb-2">Start your journey</h2>
          <p className="text-gray-500 text-sm mb-6">Browse our accredited health-worker courses and enrol today.</p>
          <Link href="/courses" className="btn-primary no-underline">Browse courses</Link>
        </div>
      )}
    </div>
  );
}
