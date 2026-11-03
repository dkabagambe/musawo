import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { CheckCircle2, XCircle, Clock, Calendar } from "lucide-react";
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
        select: { title: true, scheduledAt: true, durationMin: true, course: { select: { title: true } } },
      },
    },
  });

  const present = records.filter(
    (r) => r.startMark === "PRESENT" || r.endMark === "PRESENT" || r.markedPresent,
  ).length;
  const absent = records.filter(
    (r) => r.startMark === "ABSENT" || r.endMark === "ABSENT",
  ).length;
  const attendanceRate = records.length > 0 ? Math.round((present / records.length) * 100) : null;

  const MARK_ICON: Record<string, React.ReactNode> = {
    PRESENT: <CheckCircle2 className="w-4 h-4 text-success" />,
    ABSENT: <XCircle className="w-4 h-4 text-danger" />,
    EXCUSED: <Clock className="w-4 h-4 text-warning" />,
    LATE: <Clock className="w-4 h-4 text-warning" />,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Attendance</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your attendance record across all classes</p>
      </div>

      {records.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary">{records.length}</p>
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

      {records.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6 text-primary/40" />
          </div>
          <p className="text-gray-500 text-sm">No attendance records yet. They will appear here after your first live class.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Class</th>
                <th className="pb-2 font-medium pr-4">Course</th>
                <th className="pb-2 font-medium pr-4">Date</th>
                <th className="pb-2 font-medium pr-4">Start</th>
                <th className="pb-2 font-medium">End</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-surface/40">
                  <td className="py-2.5 pr-4 font-medium">{r.liveClass.title}</td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">{r.liveClass.course.title}</td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">
                    {new Date(r.liveClass.scheduledAt).toLocaleDateString("en-UG")}
                  </td>
                  <td className="py-2.5 pr-4">
                    {r.startMark ? (
                      <span className="flex items-center gap-1.5 text-xs">
                        {MARK_ICON[r.startMark] ?? <Clock className="w-4 h-4 text-gray-400" />}
                        {r.startMark}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-2.5">
                    {r.endMark ? (
                      <span className="flex items-center gap-1.5 text-xs">
                        {MARK_ICON[r.endMark] ?? <Clock className="w-4 h-4 text-gray-400" />}
                        {r.endMark}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
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
