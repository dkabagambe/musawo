import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "Tutor Dashboard" };

export default async function TutorDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [courses, upcomingClasses, pendingReviews] = await Promise.all([
    db.course.findMany({
      where: { tutorId: session.user.id },
      include: { _count: { select: { enrolments: true } } },
    }),
    db.liveClass.findMany({
      where: {
        tutorId: session.user.id,
        scheduledAt: { gt: new Date() },
        status: "SCHEDULED",
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: { course: { select: { title: true } } },
    }),
    db.examAttempt.count({
      where: {
        status: "SUBMITTED",
        exam: { course: { tutorId: session.user.id } },
      },
    }),
  ]);

  const enrolledTotal = courses.reduce((s, c) => s + c._count.enrolments, 0);

  const STATS = [
    { label: "My courses", value: courses.length, href: "/tutor/courses", icon: "📚" },
    { label: "Enrolled students", value: enrolledTotal, href: "/tutor/students", icon: "👥" },
    { label: "Upcoming classes", value: upcomingClasses.length, href: "/tutor/classes", icon: "📹" },
    { label: "Pending reviews", value: pendingReviews, href: "/tutor/exams", icon: "📝" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl mb-6">Welcome, {session.user.name.split(" ")[0]}!</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map((s) => (
          <Link key={s.label} href={s.href} className="card no-underline hover:shadow-md transition-shadow text-center">
            <p className="text-3xl mb-1" aria-hidden="true">{s.icon}</p>
            <p className="text-2xl font-bold text-primary">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      {upcomingClasses.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Upcoming live classes</h2>
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
                <a href={cls.joinUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs px-4 py-1.5 no-underline">
                  Join
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {pendingReviews > 0 && (
        <div className="card border-warning/30 bg-warning/5 flex items-center gap-4">
          <span className="text-3xl" aria-hidden="true">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold">Short-answer reviews pending</p>
            <p className="text-sm text-gray-500">{pendingReviews} exam attempt{pendingReviews !== 1 ? "s" : ""} awaiting your review.</p>
          </div>
          <Link href="/tutor/exams" className="btn-primary text-sm no-underline">Review now</Link>
        </div>
      )}
    </div>
  );
}
