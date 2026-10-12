import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [enrolments, upcomingClasses, unreadNotifs] = await Promise.all([
    db.enrolment.findMany({
      where: { userId: session.user.id, status: { in: ["ACTIVE", "COMPLETED"] } },
      include: {
        course: {
          select: {
            title: true,
            slug: true,
            thumbnailUrl: true,
            blocks: { select: { _count: { select: { lessons: true } } } },
          },
        },
      },
      take: 4,
    }),
    db.liveClass.findMany({
      where: {
        scheduledAt: { gt: new Date() },
        status: "SCHEDULED",
        course: {
          enrolments: { some: { userId: session.user.id, status: "ACTIVE" } },
        },
      },
      orderBy: { scheduledAt: "asc" },
      take: 3,
      select: { id: true, title: true, scheduledAt: true, joinUrl: true, course: { select: { title: true } } },
    }),
    db.notification.count({
      where: { userId: session.user.id, readAt: null },
    }),
  ]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl">Welcome back, {session.user.name.split(" ")[0]}!</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        {unreadNotifs > 0 && (
          <Link
            href="/dashboard/notifications"
            className="relative no-underline"
            aria-label={`${unreadNotifs} unread notifications`}
          >
            <span className="text-2xl" aria-hidden="true">🔔</span>
            <span className="absolute -top-1 -right-1 bg-danger text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {unreadNotifs > 9 ? "9+" : unreadNotifs}
            </span>
          </Link>
        )}
      </div>

      {/* My Courses */}
      {enrolments.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">My Courses</h2>
            <Link href="/dashboard/courses" className="text-sm text-accent no-underline">
              View all
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {enrolments.map((enr) => (
              <Link
                key={enr.id}
                href={`/dashboard/courses/${enr.course.slug}`}
                className="card flex gap-4 items-start hover:shadow-md transition-shadow no-underline"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  📚
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-primary truncate">{enr.course.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">
                    {enr.status.toLowerCase().replace("_", " ")}
                  </p>
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
                  <p className="text-xs text-gray-400">
                    {new Date(cls.scheduledAt).toLocaleString("en-UG")}
                  </p>
                </div>
                <a
                  href={cls.joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-xs px-4 py-1.5 no-underline flex-shrink-0"
                >
                  Join
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick links for empty state */}
      {enrolments.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-4xl mb-4" aria-hidden="true">🎓</p>
          <h2 className="text-lg font-semibold mb-2">Start your journey</h2>
          <p className="text-gray-500 text-sm mb-6">
            You are not enrolled in any courses yet. Browse our accredited
            health-worker courses and enrol today.
          </p>
          <Link href="/courses" className="btn-primary no-underline">
            Browse courses
          </Link>
        </div>
      )}
    </div>
  );
}
