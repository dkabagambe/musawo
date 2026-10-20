import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Calendar, Clock } from "lucide-react";

export const metadata = { title: "Timetable - Deputy Principal" };

export default async function DeputyTimetablePage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "classes.view")) redirect("/login");

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const classes = await db.liveClass.findMany({
    where: { scheduledAt: { gte: now, lte: in30Days } },
    orderBy: { scheduledAt: "asc" },
    include: {
      course: { select: { title: true } },
      tutor:  { select: { name: true } },
    },
  });

  const byDay: Record<string, typeof classes> = {};
  for (const cls of classes) {
    const day = new Date(cls.scheduledAt).toDateString();
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(cls);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Timetable</h1>
        <p className="text-gray-500 text-sm mt-1">Upcoming live classes over the next 30 days</p>
      </div>

      {Object.keys(byDay).length === 0 ? (
        <div className="card p-10 text-center">
          <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No classes scheduled in the next 30 days.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byDay).map(([day, dayClasses]) => (
            <div key={day}>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
                {new Date(day).toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long" })}
              </h2>
              <div className="space-y-3">
                {dayClasses.map((cls) => {
                  const d = new Date(cls.scheduledAt);
                  const isLive = cls.status === "LIVE";
                  return (
                    <div key={cls.id} className={`card p-4 flex items-start gap-4 ${isLive ? "border-accent/40 bg-accent/5" : ""}`}>
                      <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-white ${isLive ? "bg-accent" : "bg-primary"}`}>
                        <span className="text-[9px] font-bold uppercase">{d.toLocaleDateString("en-UG", { month: "short" })}</span>
                        <span className="text-lg font-extrabold leading-none">{d.getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-primary">{cls.title}</p>
                          {isLive && <span className="badge badge-success text-xs animate-pulse">LIVE</span>}
                          {cls.status === "SCHEDULED" && <span className="badge badge-info text-xs">Scheduled</span>}
                          {cls.status === "COMPLETED" && <span className="badge text-xs bg-gray-100 text-gray-500">Ended</span>}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{cls.course.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{d.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })} EAT, {cls.durationMin} min</span>
                          <span>Instructor: {cls.tutor.name}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
