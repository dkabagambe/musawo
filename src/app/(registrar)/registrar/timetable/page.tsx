import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";


export const metadata: Metadata = { title: "Timetable - Academic Registrar" };

export default async function RegistrarTimetablePage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "classes.view")) redirect("/registrar");

  const [upcoming, past, intakes] = await Promise.all([
    db.liveClass.findMany({
      where: { status: { in: ["SCHEDULED", "LIVE"] } },
      orderBy: { scheduledAt: "asc" },
      take: 50,
      include: {
        course: { select: { title: true } },
        tutor: { select: { name: true } },
      },
    }),
    db.liveClass.findMany({
      where: { status: "COMPLETED" },
      orderBy: { scheduledAt: "desc" },
      take: 30,
      include: {
        course: { select: { title: true } },
        tutor: { select: { name: true } },
      },
    }),
    db.intake.findMany({
      orderBy: { startDate: "desc" },
      take: 10,
      include: { course: { select: { title: true } }, _count: { select: { enrolments: true } } },
    }),
  ]);

  const STATUS_STYLE: Record<string, string> = {
    SCHEDULED: "badge-info",
    LIVE: "badge-danger",
    COMPLETED: "badge-success",
    CANCELLED: "badge",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">Timetable & Calendar</h1>
        <p className="text-sm text-gray-500 mt-0.5">Academic class schedule and intakes overview</p>
      </div>

      {/* Intakes */}
      <section>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Academic Intakes</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Programme</th>
                <th className="pb-2 font-medium pr-4">Intake Label</th>
                <th className="pb-2 font-medium pr-4">Start</th>
                <th className="pb-2 font-medium pr-4">End</th>
                <th className="pb-2 font-medium pr-4">Enrolments</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {intakes.map((i) => (
                <tr key={i.id} className="hover:bg-surface/40">
                  <td className="py-2.5 pr-4 font-medium text-primary">{i.course.title}</td>
                  <td className="py-2.5 pr-4">{i.label}</td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">{new Date(i.startDate).toLocaleDateString("en-UG")}</td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">{new Date(i.endDate).toLocaleDateString("en-UG")}</td>
                  <td className="py-2.5 pr-4 text-center font-semibold">{i._count.enrolments}</td>
                  <td className="py-2.5">
                    <span className={`badge text-xs ${i.isOpen ? "badge-success" : "badge"}`}>
                      {i.isOpen ? "Open" : "Closed"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {intakes.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">No intakes yet.</p>}
        </div>
      </section>

      {/* Upcoming classes */}
      <section>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          Upcoming Classes ({upcoming.length})
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Class</th>
                <th className="pb-2 font-medium pr-4">Programme</th>
                <th className="pb-2 font-medium pr-4">Instructor</th>
                <th className="pb-2 font-medium pr-4">Date & Time</th>
                <th className="pb-2 font-medium pr-4">Duration</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {upcoming.map((cls) => (
                <tr key={cls.id} className="hover:bg-surface/40">
                  <td className="py-2.5 pr-4 font-medium">{cls.title}</td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">{cls.course.title}</td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">{cls.tutor.name}</td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">
                    {new Date(cls.scheduledAt).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">{cls.durationMin} min</td>
                  <td className="py-2.5">
                    <span className={`badge text-xs ${STATUS_STYLE[cls.status] ?? "badge-info"}`}>
                      {cls.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {upcoming.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">No upcoming classes scheduled.</p>}
        </div>
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Past Classes</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-border">
                  <th className="pb-2 font-medium pr-4">Class</th>
                  <th className="pb-2 font-medium pr-4">Programme</th>
                  <th className="pb-2 font-medium pr-4">Instructor</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {past.map((cls) => (
                  <tr key={cls.id} className="hover:bg-surface/40">
                    <td className="py-2.5 pr-4 font-medium">{cls.title}</td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500">{cls.course.title}</td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500">{cls.tutor.name}</td>
                    <td className="py-2.5 text-xs text-gray-400">
                      {new Date(cls.scheduledAt).toLocaleDateString("en-UG")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
