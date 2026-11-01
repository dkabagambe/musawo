import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata = { title: "Attendance - Principal" };

interface Props {
  searchParams: { classId?: string };
}

export default async function PrincipalAttendancePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/403");

  // Recent completed/live classes with attendance records
  const recentClasses = await db.liveClass.findMany({
    where: {
      status: { in: ["COMPLETED", "LIVE"] },
      attendance: { some: {} },
    },
    orderBy: { scheduledAt: "desc" },
    take: 20,
    include: {
      course: { select: { title: true } },
      tutor: { select: { name: true } },
      _count: { select: { attendance: true } },
    },
  });

  const selectedId = searchParams.classId ?? recentClasses[0]?.id ?? null;

  const attendanceRecords = selectedId
    ? await db.attendance.findMany({
        where: { liveClassId: selectedId },
        orderBy: { user: { name: "asc" } },
        include: {
          user: { select: { name: true, studentNumber: true } },
        },
      })
    : [];

  const selectedClass = recentClasses.find((c) => c.id === selectedId);
  const presentCount = attendanceRecords.filter((a) => a.markedPresent).length;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-sm text-gray-500 mt-1">View attendance records from live classes</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Class list */}
        <div className="md:col-span-1">
          <h2 className="font-semibold text-sm mb-3 text-gray-500 uppercase tracking-wide">
            Recent Classes
          </h2>
          {recentClasses.length === 0 ? (
            <p className="text-gray-400 text-sm">No classes with attendance yet.</p>
          ) : (
            <div className="space-y-2">
              {recentClasses.map((c) => (
                <a
                  key={c.id}
                  href={`/principal/attendance?classId=${c.id}`}
                  className={`block rounded-xl px-3 py-2.5 text-sm no-underline transition-colors ${
                    selectedId === c.id
                      ? "bg-primary text-white"
                      : "hover:bg-surface border border-border"
                  }`}
                >
                  <p className="font-medium truncate">{c.title}</p>
                  <p className={`text-xs mt-0.5 ${selectedId === c.id ? "text-white/70" : "text-gray-400"}`}>
                    {c.course.title}
                  </p>
                  <p className={`text-xs ${selectedId === c.id ? "text-white/70" : "text-gray-400"}`}>
                    {new Date(c.scheduledAt).toLocaleDateString("en-UG")} &middot;{" "}
                    {c._count.attendance} students
                  </p>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Attendance detail */}
        <div className="md:col-span-2">
          {!selectedClass ? (
            <div className="card text-center py-16">
              <p className="text-gray-400 text-sm">Select a class to view attendance</p>
            </div>
          ) : (
            <div className="card">
              <div className="mb-4">
                <h2 className="font-semibold text-base">{selectedClass.title}</h2>
                <p className="text-xs text-gray-400">
                  {selectedClass.course.title} &middot; {selectedClass.tutor.name} &middot;{" "}
                  {new Date(selectedClass.scheduledAt).toLocaleString("en-UG")}
                </p>
              </div>
              {attendanceRecords.length === 0 ? (
                <p className="text-gray-400 text-sm py-6 text-center">
                  No attendance records for this class.
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <span className="text-green-700 font-medium">{presentCount} present</span>
                    <span className="text-danger font-medium">
                      {attendanceRecords.length - presentCount} absent
                    </span>
                    <span className="text-gray-400 text-xs">
                      {Math.round((presentCount / attendanceRecords.length) * 100)}% attendance
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-400 border-b border-border">
                          <th className="pb-2 font-medium pr-4">Student</th>
                          <th className="pb-2 font-medium pr-4">Student No.</th>
                          <th className="pb-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {attendanceRecords.map((a) => (
                          <tr key={a.id}>
                            <td className="py-2 pr-4 font-medium">{a.user.name}</td>
                            <td className="py-2 pr-4 font-mono text-xs text-gray-400">
                              {a.user.studentNumber ?? "-"}
                            </td>
                            <td className="py-2">
                              {a.markedPresent ? (
                                <span className="badge badge-success text-xs">Present</span>
                              ) : a.joinedAt ? (
                                <span className="badge badge-warning text-xs">Joined</span>
                              ) : (
                                <span className="badge badge-danger text-xs">Absent</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
