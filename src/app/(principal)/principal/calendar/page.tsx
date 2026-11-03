import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
export const dynamic = "force-dynamic";


export const metadata = { title: "Academic Calendar - Principal" };

export default async function PrincipalCalendarPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) redirect("/403");

  const now = new Date();

  const [intakes, exams, classes] = await Promise.all([
    db.intake.findMany({
      where: { endDate: { gte: now } },
      orderBy: { startDate: "asc" },
      take: 10,
      include: { course: { select: { title: true, courseCode: true } } },
    }),
    db.exam.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { course: { select: { title: true } } },
    }),
    db.liveClass.findMany({
      where: {
        scheduledAt: { gte: now },
        status: "SCHEDULED",
      },
      orderBy: { scheduledAt: "asc" },
      take: 10,
      include: {
        course: { select: { title: true } },
        tutor: { select: { name: true } },
      },
    }),
  ]);

  type CalendarEvent = {
    id: string;
    date: Date;
    label: string;
    type: "intake" | "exam" | "class";
  };

  const events: CalendarEvent[] = [
    ...intakes.map((i) => ({
      id: i.id,
      date: i.startDate,
      label: `Intake starts: ${i.course.title} (${i.label})`,
      type: "intake" as const,
    })),
    ...classes.map((c) => ({
      id: c.id,
      date: c.scheduledAt,
      label: `Live class: ${c.title} - ${c.tutor.name}`,
      type: "class" as const,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const TYPE_ICON: Record<string, string> = {
    intake: "📅",
    exam:   "📝",
    class:  "🎓",
  };

  const TYPE_COLOR: Record<string, string> = {
    intake: "border-l-primary",
    exam:   "border-l-warning",
    class:  "border-l-green-500",
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Academic Calendar</h1>
        <p className="text-sm text-gray-500 mt-1">Upcoming intakes, classes and events</p>
      </div>

      {events.length === 0 && exams.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📅</p>
          <p className="text-gray-500 text-sm">No upcoming events scheduled.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <div key={`${e.type}-${e.id}`} className={`card border-l-4 ${TYPE_COLOR[e.type]}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl" aria-hidden="true">{TYPE_ICON[e.type]}</span>
                <div>
                  <p className="font-medium text-sm">{e.label}</p>
                  <p className="text-xs text-gray-400">
                    {e.date.toLocaleDateString("en-UG", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {exams.length > 0 && (
            <>
              <h2 className="font-semibold text-sm text-gray-500 mt-4 mb-2">Active Exams</h2>
              {exams.map((e) => (
                <div key={e.id} className="card border-l-4 border-l-warning">
                  <div className="flex items-center gap-3">
                    <span className="text-xl" aria-hidden="true">📝</span>
                    <div>
                      <p className="font-medium text-sm">{e.title}</p>
                      <p className="text-xs text-gray-400">{e.course.title}</p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
