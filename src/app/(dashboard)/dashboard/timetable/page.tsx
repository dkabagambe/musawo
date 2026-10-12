import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const metadata = { title: "Timetable" };

export default async function TimetablePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [upcoming, past] = await Promise.all([
    db.liveClass.findMany({
      where: {
        scheduledAt: { gt: new Date() },
        status: { in: ["SCHEDULED", "LIVE"] },
        course: {
          enrolments: { some: { userId: session.user.id, status: "ACTIVE" } },
        },
      },
      orderBy: { scheduledAt: "asc" },
      include: {
        course: { select: { title: true, slug: true } },
        tutor: { select: { name: true } },
      },
    }),
    db.liveClass.findMany({
      where: {
        scheduledAt: { lte: new Date() },
        course: {
          enrolments: {
            some: {
              userId: session.user.id,
              status: { in: ["ACTIVE", "COMPLETED"] },
            },
          },
        },
      },
      orderBy: { scheduledAt: "desc" },
      take: 10,
      include: {
        course: { select: { title: true, slug: true } },
        tutor: { select: { name: true } },
      },
    }),
  ]);

  const platformLabel: Record<string, string> = {
    google_meet: "Google Meet",
    zoom: "Zoom",
    jitsi: "Jitsi",
  };

  function formatDateTime(d: Date) {
    return new Date(d).toLocaleString("en-UG", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl mb-6">Timetable</h1>

      {/* Upcoming */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Upcoming classes</h2>
        {upcoming.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-3xl mb-2" aria-hidden="true">📅</p>
            <p className="text-gray-500 text-sm">No upcoming classes scheduled.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcoming.map((cls) => (
              <div key={cls.id} className="card flex items-start gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" aria-hidden="true">
                  📹
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-sm">{cls.title}</h3>
                    {cls.status === "LIVE" && (
                      <span className="badge badge-danger text-xs animate-pulse">
                        🔴 LIVE
                      </span>
                    )}
                    <span className="badge badge-info text-xs">
                      {platformLabel[cls.platform] ?? cls.platform}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{cls.course.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDateTime(cls.scheduledAt)} · {cls.durationMin} min · {cls.tutor.name}
                  </p>
                </div>
                <a
                  href={cls.joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-xs px-4 py-2 no-underline flex-shrink-0"
                >
                  Join
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Past classes</h2>
          <div className="space-y-3">
            {past.map((cls) => (
              <div
                key={cls.id}
                className="card flex items-start gap-4 opacity-75"
              >
                <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center text-xl flex-shrink-0" aria-hidden="true">
                  📹
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm">{cls.title}</h3>
                  <p className="text-xs text-gray-400">
                    {cls.course.title} · {formatDateTime(cls.scheduledAt)}
                  </p>
                </div>
                {cls.recordingUrl && (
                  <a
                    href={cls.recordingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline text-xs px-3 py-1.5 no-underline flex-shrink-0"
                  >
                    Watch recording
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
