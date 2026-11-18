import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";
export const dynamic = "force-dynamic";

export const metadata = { title: "Timetable Matrix - Admin" };

export default async function TimetableMatrixPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/403");

  // Get all instructors with their classes for the next 7 days
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);

  const instructors = await db.user.findMany({
    where: { role: "INSTRUCTOR" },
    select: {
      id: true,
      name: true,
      liveClasses: {
        where: {
          scheduledAt: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            in: ["SCHEDULED", "LIVE"],
          },
        },
        orderBy: { scheduledAt: "asc" },
        select: {
          id: true,
          title: true,
          scheduledAt: true,
          venue: true,
          status: true,
          course: {
            select: {
              courseCode: true,
            },
          },
          block: {
            select: {
              order: true,
              title: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Generate days of week
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate);
    day.setDate(day.getDate() + i);
    days.push(day);
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/timetable"
          className="text-sm text-accent hover:underline mb-2 inline-block"
        >
          ← Back to Timetable
        </Link>
        <h1 className="text-2xl font-bold">Timetable Matrix</h1>
        <p className="text-sm text-gray-500 mt-1">
          Week view by instructor - shows who teaches which block, when, and where
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="py-3 px-2 text-left font-medium sticky left-0 bg-white dark:bg-gray-900">
                Instructor
              </th>
              {days.map((day) => (
                <th key={day.toISOString()} className="py-3 px-2 text-left font-medium">
                  <div>{day.toLocaleDateString("en-UG", { weekday: "short" })}</div>
                  <div className="text-gray-500 font-normal">
                    {day.toLocaleDateString("en-UG", { month: "short", day: "numeric" })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {instructors.map((instructor) => {
              // Group classes by day
              const classesByDay: Record<string, typeof instructor.liveClasses> = {};
              instructor.liveClasses.forEach((cls) => {
                const dayKey = new Date(cls.scheduledAt).toDateString();
                if (!classesByDay[dayKey]) {
                  classesByDay[dayKey] = [];
                }
                classesByDay[dayKey].push(cls);
              });

              return (
                <tr key={instructor.id} className="border-b border-border">
                  <td className="py-3 px-2 font-medium sticky left-0 bg-white dark:bg-gray-900">
                    {instructor.name}
                  </td>
                  {days.map((day) => {
                    const dayKey = day.toDateString();
                    const dayClasses = classesByDay[dayKey] || [];

                    return (
                      <td key={dayKey} className="py-3 px-2 align-top">
                        {dayClasses.length === 0 ? (
                          <span className="text-gray-400">-</span>
                        ) : (
                          <div className="space-y-1">
                            {dayClasses.map((cls) => (
                              <div
                                key={cls.id}
                                className="p-1 bg-accent/10 rounded text-xs"
                              >
                                <div className="font-medium">
                                  {new Date(cls.scheduledAt).toLocaleTimeString("en-UG", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                                <div className="text-gray-600 dark:text-gray-400">
                                  {cls.course.courseCode} B{cls.block?.order}
                                </div>
                                {cls.venue && (
                                  <div className="text-gray-500 truncate">
                                    {cls.venue}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {instructors.length === 0 && (
          <p className="text-center py-8 text-gray-500">No instructors found.</p>
        )}
      </div>
    </div>
  );
}
