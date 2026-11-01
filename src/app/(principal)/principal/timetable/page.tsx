import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata = { title: "Timetable - Principal" };

export default async function PrincipalTimetablePage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/403");

  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [classes, practicals] = await Promise.all([
    db.liveClass.findMany({
      where: {
        scheduledAt: { gte: now, lte: weekEnd },
        status: { in: ["SCHEDULED", "LIVE"] },
      },
      orderBy: { scheduledAt: "asc" },
      include: {
        course: { select: { title: true } },
        tutor:  { select: { name: true } },
      },
    }),
    db.practicalSession.findMany({
      where: {
        startsAt: { gte: now, lte: weekEnd },
      },
      orderBy: { startsAt: "asc" },
      include: {
        venue: { select: { name: true, location: true } },
      },
    }),
  ]);

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  type TimetableItem = {
    id: string;
    title: string;
    time: Date;
    type: "class" | "practical";
    detail: string;
    joinUrl?: string;
  };

  const items: TimetableItem[] = [
    ...classes.map((c) => ({
      id: c.id,
      title: c.title,
      time: c.scheduledAt,
      type: "class" as const,
      detail: `${c.course.title} - ${c.tutor.name}`,
      joinUrl: c.joinUrl,
    })),
    ...practicals.map((p) => ({
      id: p.id,
      title: p.title,
      time: p.startsAt,
      type: "practical" as const,
      detail: `${p.venue.name}${p.venue.location ? ` (${p.venue.location})` : ""}`,
    })),
  ].sort((a, b) => a.time.getTime() - b.time.getTime());

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Timetable</h1>
        <p className="text-sm text-gray-500 mt-1">
          Next 7 days - live classes and practical sessions
        </p>
      </div>

      {items.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📆</p>
          <p className="text-gray-500 text-sm">No classes or sessions scheduled in the next 7 days.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={`${item.type}-${item.id}`} className={`card border-l-4 ${
              item.type === "class" ? "border-l-primary" : "border-l-amber-500"
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold text-sm">{item.title}</h2>
                    <span className={`badge text-xs ${
                      item.type === "class" ? "badge-info" : "badge-warning"
                    }`}>
                      {item.type === "class" ? "Live Class" : "Practical"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{item.detail}</p>
                  {item.joinUrl && (
                    <a
                      href={item.joinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent underline mt-0.5 inline-block"
                    >
                      Google Meet
                    </a>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium">
                    {days[item.time.getDay()]}{" "}
                    {item.time.toLocaleDateString("en-UG", { day: "numeric", month: "short" })}
                  </p>
                  <p className="text-xs text-gray-400">
                    {item.time.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
