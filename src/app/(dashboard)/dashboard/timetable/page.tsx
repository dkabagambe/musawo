import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Calendar, Video, PlayCircle } from "lucide-react";
import StudentJoinClass from "./StudentJoinClass";

export const metadata = { title: "Timetable" };

export default async function TimetablePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [upcoming, past] = await Promise.all([
    db.liveClass.findMany({
      where: {
        OR: [{ scheduledAt: { gt: new Date() } }, { status: "LIVE" }],
        status: { in: ["SCHEDULED","LIVE"] },
        course: { enrolments: { some: { userId: session.user.id, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] } } } },
      },
      orderBy: { scheduledAt: "asc" },
      include: { course: { select: { title: true } }, tutor: { select: { name: true } } },
    }),
    db.liveClass.findMany({
      where: {
        scheduledAt: { lte: new Date() },
        status: "COMPLETED",
        course: { enrolments: { some: { userId: session.user.id, status: { in: ["ACTIVE","COMPLETED"] } } } },
      },
      orderBy: { scheduledAt: "desc" },
      take: 10,
      include: { course: { select: { title: true } }, tutor: { select: { name: true } } },
    }),
  ]);

  const PLATFORM_LABEL: Record<string, string> = { google_meet: "Google Meet", zoom: "Zoom", jitsi: "Jitsi" };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">Timetable</h1>
        <p className="text-gray-500 text-sm mt-1">Your live class schedule</p>
      </div>

      {/* Upcoming */}
      <section>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Upcoming Classes</h2>
        {upcoming.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-10 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-primary/40" />
            </div>
            <p className="text-gray-500 text-sm">No upcoming classes scheduled.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((cls) => {
              const date = new Date(cls.scheduledAt);
              const isLive = cls.status === "LIVE";
              const isToday = date.toDateString() === new Date().toDateString();
              const isStartingSoon = !isLive && date.getTime() > Date.now() && date.getTime() - Date.now() <= 60 * 60 * 1000;
              return (
                <div key={cls.id} className={`bg-white rounded-2xl border p-5 flex items-start gap-4 shadow-sm ${isLive ? "border-danger/30" : "border-border"}`}>
                  {/* Date block */}
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
                      {isLive && (
                        <span className="text-xs font-bold bg-danger text-white px-2 py-0.5 rounded-full animate-pulse">🔴 LIVE</span>
                      )}
                      {isStartingSoon && <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Starting soon</span>}
                      <span className="text-xs text-gray-400 bg-surface px-2 py-0.5 rounded-full">
                        {PLATFORM_LABEL[cls.platform] ?? cls.platform}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{cls.course.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {date.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })} EAT ·
                      {cls.durationMin} min · {cls.tutor.name}
                    </p>
                  </div>

                  <StudentJoinClass classId={cls.id} isLive={isLive} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Past classes */}
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
                      {cls.course.title} · {new Date(cls.scheduledAt).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  {cls.recordingUrl ? (
                    <Link href="/dashboard/recordings"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent border border-accent/30 px-3 py-1.5 rounded-xl no-underline hover:bg-accent hover:text-white transition-colors flex-shrink-0">
                      <PlayCircle className="w-3.5 h-3.5" /> Replay
                    </Link>
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
