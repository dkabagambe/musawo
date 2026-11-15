import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { CheckCircle2, XCircle, Clock, Calendar, AlertTriangle, MessageSquare } from "lucide-react";
import AttendanceDispute from "./AttendanceDispute";

export const dynamic = "force-dynamic";
export const metadata = { title: "Attendance - Student" };

export default async function StudentAttendancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const records = await db.attendance.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      liveClass: {
        select: {
          id: true,
          title: true,
          scheduledAt: true,
          durationMin: true,
          minimumAttendancePercent: true,
          course: { select: { id: true, title: true } },
          tutor: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Only count records that have been marked (startMark or endMark set)
  const markedRecords = records.filter(
    (r) => r.startMark !== null || r.endMark !== null || r.markedPresent,
  );

  const present = markedRecords.filter(
    (r) => r.startMark === "PRESENT" || r.endMark === "PRESENT" || r.markedPresent,
  ).length;
  const absent = markedRecords.filter(
    (r) => r.startMark === "ABSENT" || r.endMark === "ABSENT",
  ).length;
  const attendanceRate =
    markedRecords.length > 0 ? Math.round((present / markedRecords.length) * 100) : null;

  // Per-course-unit percentage
  const byCourse = new Map<
    string,
    { title: string; present: number; total: number; minPercent: number }
  >();
  for (const r of markedRecords) {
    const courseId = r.liveClass.course.id;
    if (!byCourse.has(courseId)) {
      byCourse.set(courseId, {
        title: r.liveClass.course.title,
        present: 0,
        total: 0,
        minPercent: r.liveClass.minimumAttendancePercent ?? 75,
      });
    }
    const entry = byCourse.get(courseId)!;
    entry.total++;
    if (r.startMark === "PRESENT" || r.endMark === "PRESENT" || r.markedPresent) {
      entry.present++;
    }
  }
  const courseStats = Array.from(byCourse.values()).map((c) => ({
    ...c,
    rate: c.total > 0 ? Math.round((c.present / c.total) * 100) : null,
  }));

  // Overall minimum attendance (use the most common, or 75 as default)
  const overallMin = courseStats.length > 0 ? courseStats[0]!.minPercent : 75;

  const MARK_ICON: Record<string, React.ReactNode> = {
    PRESENT: <CheckCircle2 className="w-4 h-4 text-success" />,
    ABSENT: <XCircle className="w-4 h-4 text-danger" />,
    EXCUSED: <Clock className="w-4 h-4 text-gray-400" />,
    LATE: <Clock className="w-4 h-4 text-warning" />,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Attendance</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Your attendance record across all classes
        </p>
      </div>

      {/* Overall summary */}
      {markedRecords.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary">{markedRecords.length}</p>
            <p className="text-xs text-gray-500 mt-1">Classes recorded</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-success">{present}</p>
            <p className="text-xs text-gray-500 mt-1">Present</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary">
              {attendanceRate !== null ? `${attendanceRate}%` : "N/A"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Attendance rate</p>
          </div>
        </div>
      )}

      {/* Minimum attendance warning */}
      {attendanceRate !== null && attendanceRate < overallMin && (
        <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-warning">
              Below minimum attendance ({overallMin}%)
            </p>
            <p className="text-xs text-warning/80 mt-0.5">
              Your attendance rate is {attendanceRate}%. The minimum required is {overallMin}%.
              You may not be eligible for examinations or certificates until this improves.
              Contact your instructor if you believe a record is incorrect.
            </p>
          </div>
        </div>
      )}

      {/* Per-course-unit breakdown */}
      {courseStats.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Per Course Unit
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {courseStats.map((stat, i) => (
              <div key={i} className="card space-y-1">
                <p className="text-sm font-medium text-primary truncate">{stat.title}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    {stat.present}/{stat.total} present
                  </span>
                  <span
                    className={
                      stat.rate !== null && stat.rate < stat.minPercent
                        ? "font-bold text-danger"
                        : "font-bold text-success"
                    }
                  >
                    {stat.rate !== null ? `${stat.rate}%` : "N/A"}
                  </span>
                </div>
                {stat.rate !== null && stat.rate < stat.minPercent && (
                  <p className="text-xs text-danger">
                    Below minimum ({stat.minPercent}%)
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Attendance records table */}
      {records.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6 text-primary/40" />
          </div>
          <p className="text-gray-500 text-sm">
            No attendance records yet. They will appear here after your first live class.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Class</th>
                <th className="pb-2 font-medium pr-4">Course</th>
                <th className="pb-2 font-medium pr-4">Instructor</th>
                <th className="pb-2 font-medium pr-4">Date</th>
                <th className="pb-2 font-medium pr-4">Start</th>
                <th className="pb-2 font-medium pr-4">End</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-surface/40">
                  <td className="py-2.5 pr-4 font-medium">{r.liveClass.title}</td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">
                    {r.liveClass.course.title}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">
                    {r.liveClass.tutor?.name ?? "-"}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">
                    {new Date(r.liveClass.scheduledAt).toLocaleDateString("en-UG")}
                  </td>
                  <td className="py-2.5 pr-4">
                    {r.startMark ? (
                      <span className="flex items-center gap-1.5 text-xs">
                        {MARK_ICON[r.startMark] ?? (
                          <Clock className="w-4 h-4 text-gray-400" />
                        )}
                        {r.startMark}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    {r.endMark ? (
                      <span className="flex items-center gap-1.5 text-xs">
                        {MARK_ICON[r.endMark] ?? (
                          <Clock className="w-4 h-4 text-gray-400" />
                        )}
                        {r.endMark}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-2.5">
                    <AttendanceDispute
                      classId={r.liveClass.id}
                      className={r.liveClass.title}
                      tutorId={r.liveClass.tutor?.id}
                      startMark={r.startMark}
                      endMark={r.endMark}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
