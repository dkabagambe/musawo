import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { Calendar, Clock, Video } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Timetable - Teaching Portal" };

export default async function TutorTimetablePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [upcoming, past] = await Promise.all([
    db.liveClass.findMany({
      where: {
        course: teachingCourseWhere(session.user.id),
        status: { in: ["SCHEDULED", "LIVE"] },
      },
      orderBy: { scheduledAt: "asc" },
      include: { course: { select: { title: true } } },
    }),
    db.liveClass.findMany({
      where: {
        course: teachingCourseWhere(session.user.id),
        status: "COMPLETED",
      },
      orderBy: { scheduledAt: "desc" },
      take: 20,
      include: { course: { select: { title: true } } },
    }),
  ]);

  const PLATFORM_LABEL: Record<string, string> = {
    google_meet: "Google Meet",
    zoom: "Zoom",
    jitsi: "Jitsi",
    link: "External link",
  };

  const STATUS_STYLE: Record<string, string> = {
    SCHEDULED: "badge-info",
    LIVE: "badge-danger",
    COMPLETED: "badge-success",
    CANCELLED: "badge",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Timetable</h1>
          <p className="text-sm text-gray-500 mt-1">Your scheduled and past classes</p>
        </div>
        <Link href="/tutor/classes" className="btn-secondary text-sm no-underline">
          Manage classes
        </Link>
      </div>

      <section>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
          Upcoming & Live ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-10 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-primary/40" />
            </div>
            <p className="text-gray-500 text-sm">No upcoming classes. Schedule one from Manage classes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((cls) => {
              const date = new Date(cls.scheduledAt);
              const isLive = cls.status === "LIVE";
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div
                  key={cls.id}
                  className={`bg-white rounded-2xl border p-5 flex items-start gap-4 shadow-sm ${isLive ? "border-danger/30" : "border-border"}`}
                >
                  <div className={`w-14 flex-shrink-0 text-center rounded-xl p-2 ${isLive ? "bg-danger" : isToday ? "bg-accent" : "bg-primary"}`}>
                    <p className="text-[10px] font-bold text-white/80 uppercase leading-none">
                      {date.toLocaleDateString("en-UG", { month: "short" })}
                    </p>
                    <p className="text-2xl font-extrabold text-white leading-tight">{date.getDate()}</p>
                    <p className="text-[10px] text-white/70 leading-none">
                      {date.toLocaleDateString("en-UG", { weekday: "short" })}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-primary text-sm">{cls.title}</h3>
                      <span className={`badge text-xs ${STATUS_STYLE[cls.status] ?? "badge-info"}`}>
                        {isLive ? "LIVE NOW" : cls.status}
                      </span>
                      <span className="text-xs text-gray-400 bg-surface px-2 py-0.5 rounded-full">
                        {PLATFORM_LABEL[cls.platform] ?? cls.platform}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{cls.course.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      <Clock className="inline w-3 h-3 mr-0.5" />
                      {date.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })} EAT &middot; {cls.durationMin} min
                    </p>
                  </div>
                  {cls.joinUrl && (
                    <a
                      href={cls.joinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl no-underline transition-colors ${
                        isLive
                          ? "bg-danger text-white hover:bg-red-600"
                          : "border border-primary text-primary hover:bg-primary hover:text-white"
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      {isLive ? "Join live" : "Open link"}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Past Classes</h2>
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="divide-y divide-border">
              {past.map((cls) => (
                <div key={cls.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 bg-surface rounded-xl flex items-center justify-center flex-shrink-0">
                    <Video className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{cls.title}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {cls.course.title} &middot; {new Date(cls.scheduledAt).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })} &middot; {cls.durationMin} min
                    </p>
                  </div>
                  {cls.recordingUrl ? (
                    <span className="text-xs text-success font-medium flex-shrink-0">Recording added</span>
                  ) : (
                    <span className="text-xs text-gray-400 flex-shrink-0">No recording</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
