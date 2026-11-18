import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";
export const dynamic = "force-dynamic";

export const metadata = { title: "Timetable Coordination - Admin" };

export default async function AdminTimetablePage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/403");

  // Get upcoming classes for the next 14 days
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 14);

  const classes = await db.liveClass.findMany({
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
    include: {
      course: {
        select: {
          title: true,
          courseCode: true,
        },
      },
      block: {
        select: {
          title: true,
          order: true,
        },
      },
      tutor: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          attendance: true,
        },
      },
    },
  });

  // Get all instructors
  const instructors = await db.user.findMany({
    where: { role: "INSTRUCTOR" },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  // Group classes by date
  const classesByDate: Record<string, typeof classes> = {};
  classes.forEach((cls) => {
    const dateKey = new Date(cls.scheduledAt).toLocaleDateString("en-UG");
    if (!classesByDate[dateKey]) {
      classesByDate[dateKey] = [];
    }
    classesByDate[dateKey].push(cls);
  });

  // Detect conflicts (same instructor, same time)
  const conflicts: Array<{ cls1: typeof classes[0]; cls2: typeof classes[0] }> = [];
  for (let i = 0; i < classes.length; i++) {
    for (let j = i + 1; j < classes.length; j++) {
      const cls1 = classes[i];
      const cls2 = classes[j];

      if (cls1.tutorId === cls2.tutorId) {
        const time1 = new Date(cls1.scheduledAt).getTime();
        const time2 = new Date(cls2.scheduledAt).getTime();
        const diff = Math.abs(time1 - time2);

        // If within 2 hours, consider it a conflict
        if (diff < 2 * 60 * 60 * 1000) {
          conflicts.push({ cls1, cls2 });
        }
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Timetable Coordination</h1>
        <p className="text-sm text-gray-500 mt-1">
          Coordinate classes, detect conflicts, and manage instructor schedules
        </p>
      </div>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <div className="card bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-6">
          <h2 className="font-semibold text-red-800 dark:text-red-200 mb-3">
            ⚠️ {conflicts.length} Schedule Conflict{conflicts.length !== 1 ? "s" : ""} Detected
          </h2>
          <div className="space-y-2">
            {conflicts.slice(0, 5).map((conflict, idx) => (
              <div
                key={idx}
                className="text-sm bg-white dark:bg-gray-900 p-3 rounded"
              >
                <p className="font-medium text-red-600 dark:text-red-400">
                  Instructor: {conflict.cls1.tutor.name}
                </p>
                <div className="mt-1 text-xs space-y-1">
                  <p>
                    • {conflict.cls1.course.courseCode} - {conflict.cls1.title} at{" "}
                    {new Date(conflict.cls1.scheduledAt).toLocaleString("en-UG")}
                  </p>
                  <p>
                    • {conflict.cls2.course.courseCode} - {conflict.cls2.title} at{" "}
                    {new Date(conflict.cls2.scheduledAt).toLocaleString("en-UG")}
                  </p>
                </div>
              </div>
            ))}
            {conflicts.length > 5 && (
              <p className="text-xs text-gray-500">
                And {conflicts.length - 5} more conflicts...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="card text-center">
          <p className="text-2xl font-bold text-accent">{classes.length}</p>
          <p className="text-sm text-gray-500">Classes Next 14 Days</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-blue-600">{instructors.length}</p>
          <p className="text-sm text-gray-500">Active Instructors</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-600">
            {classes.filter((c) => c.status === "SCHEDULED").length}
          </p>
          <p className="text-sm text-gray-500">Scheduled</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-600">{conflicts.length}</p>
          <p className="text-sm text-gray-500">Conflicts</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/timetable/create" className="btn btn-primary">
            Create New Session
          </Link>
          <Link href="/admin/timetable/matrix" className="btn btn-secondary">
            View Matrix (By Instructor)
          </Link>
          <Link href="/admin/timetable/calendar" className="btn btn-secondary">
            Calendar View
          </Link>
        </div>
      </div>

      {/* Classes by Date */}
      <div className="space-y-6">
        {Object.keys(classesByDate).length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-3xl mb-3">📅</p>
            <p className="text-gray-500 text-sm">
              No classes scheduled for the next 14 days.
            </p>
          </div>
        ) : (
          Object.entries(classesByDate).map(([date, dateClasses]) => (
            <div key={date} className="card">
              <h2 className="font-semibold mb-4">{date}</h2>
              <div className="space-y-3">
                {dateClasses.map((cls) => {
                  const time = new Date(cls.scheduledAt).toLocaleTimeString("en-UG", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const hasConflict = conflicts.some(
                    (c) => c.cls1.id === cls.id || c.cls2.id === cls.id,
                  );

                  return (
                    <div
                      key={cls.id}
                      className={`flex items-start justify-between p-3 rounded ${
                        hasConflict
                          ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                          : "bg-gray-50 dark:bg-gray-800"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-medium">
                            {time}
                          </span>
                          {hasConflict && (
                            <span className="badge badge-danger text-xs">Conflict</span>
                          )}
                        </div>
                        <p className="font-medium">{cls.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {cls.course.courseCode} - Block {cls.block?.order}:{" "}
                          {cls.block?.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Instructor: {cls.tutor.name}
                        </p>
                        {cls.venue && (
                          <p className="text-xs text-gray-500">Venue: {cls.venue}</p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Link
                          href={`/admin/timetable/${cls.id}/edit`}
                          className="btn btn-sm btn-secondary"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
