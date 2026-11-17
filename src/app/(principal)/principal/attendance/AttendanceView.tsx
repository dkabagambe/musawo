"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  view: string;
  data: any;
  canEdit: boolean;
};

export default function AttendanceView({ view, data, canEdit }: Props) {
  const router = useRouter();
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleChangeView = (newView: string) => {
    router.push(`/principal/attendance?view=${newView}`);
  };

  const handleEditAttendance = async (formData: FormData) => {
    setLoading(true);
    try {
      const response = await fetch("/api/principal/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendanceId: formData.get("attendanceId"),
          markedPresent: formData.get("markedPresent") === "true",
          editReason: formData.get("editReason"),
        }),
      });

      if (!response.ok) throw new Error("Failed to update attendance");

      setEditingRecord(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to update attendance record");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const params = new URLSearchParams({ view });
    if (view === "by-class" && data.selectedClassId) {
      params.set("classId", data.selectedClassId);
    } else if (view === "by-course" && data.selectedCourseId) {
      params.set("courseId", data.selectedCourseId);
    } else if (view === "by-instructor" && data.selectedInstructorId) {
      params.set("instructorId", data.selectedInstructorId);
    } else if (view === "by-student" && data.selectedStudentId) {
      params.set("studentId", data.selectedStudentId);
    }

    window.open(`/api/principal/attendance/export?${params.toString()}`, "_blank");
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage attendance records across classes
          </p>
        </div>
        <button onClick={handleExport} className="btn-secondary text-sm">
          📥 Export CSV
        </button>
      </div>

      {/* View selector */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {[
          { value: "by-class", label: "By Class" },
          { value: "by-course", label: "By Course" },
          { value: "by-instructor", label: "By Instructor" },
          { value: "by-student", label: "By Student" },
          { value: "low-attendance", label: "⚠️ Low Attendance" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleChangeView(tab.value)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              view === tab.value
                ? "bg-primary text-white"
                : "bg-surface border border-border hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Edit modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Edit Attendance Record</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEditAttendance(new FormData(e.currentTarget));
              }}
            >
              <input type="hidden" name="attendanceId" value={editingRecord.id} />

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Student: {editingRecord.user.name}</p>
                  <p className="text-xs text-gray-400 mb-4">
                    Current status:{" "}
                    {editingRecord.markedPresent ? (
                      <span className="text-green-600 font-medium">Present</span>
                    ) : (
                      <span className="text-red-600 font-medium">Absent</span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    New Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="markedPresent"
                    required
                    defaultValue={editingRecord.markedPresent ? "true" : "false"}
                    className="input w-full"
                  >
                    <option value="true">Present</option>
                    <option value="false">Absent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Reason for Change <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="editReason"
                    required
                    rows={3}
                    className="input w-full"
                    placeholder="Explain why this attendance record is being modified..."
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    All attendance edits are audited and logged
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  disabled={loading}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content based on view */}
      {view === "by-class" && <ByClassView data={data} canEdit={canEdit} onEdit={setEditingRecord} />}
      {view === "by-course" && <ByCourseView data={data} />}
      {view === "by-instructor" && <ByInstructorView data={data} />}
      {view === "by-student" && <ByStudentView data={data} canEdit={canEdit} onEdit={setEditingRecord} />}
      {view === "low-attendance" && <LowAttendanceView data={data} />}
    </div>
  );
}

function ByClassView({ data, canEdit, onEdit }: any) {
  const { classes, selectedClassId, attendanceRecords } = data;
  const selectedClass = classes?.find((c: any) => c.id === selectedClassId);
  const presentCount = attendanceRecords?.filter((a: any) => a.markedPresent).length || 0;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Class list */}
      <div className="lg:col-span-1">
        <h2 className="font-semibold text-sm mb-3 text-gray-500 uppercase tracking-wide">
          Recent Classes ({classes?.length || 0})
        </h2>
        {!classes || classes.length === 0 ? (
          <p className="text-gray-400 text-sm">No classes with attendance yet.</p>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {classes.map((c: any) => (
              <a
                key={c.id}
                href={`/principal/attendance?view=by-class&classId=${c.id}`}
                className={`block rounded-xl px-3 py-2.5 text-sm no-underline transition-colors ${
                  selectedClassId === c.id
                    ? "bg-primary text-white"
                    : "hover:bg-surface border border-border"
                }`}
              >
                <p className="font-medium truncate">{c.title}</p>
                <p
                  className={`text-xs mt-0.5 ${
                    selectedClassId === c.id ? "text-white/70" : "text-gray-400"
                  }`}
                >
                  {c.course.title}
                </p>
                <p
                  className={`text-xs ${
                    selectedClassId === c.id ? "text-white/70" : "text-gray-400"
                  }`}
                >
                  {new Date(c.scheduledAt).toLocaleDateString("en-UG")} &middot; {c._count.attendance}{" "}
                  students
                </p>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Attendance detail */}
      <div className="lg:col-span-2">
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
            {!attendanceRecords || attendanceRecords.length === 0 ? (
              <p className="text-gray-400 text-sm py-6 text-center">
                No attendance records for this class.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-4 text-sm flex-wrap">
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
                        <th className="pb-2 font-medium pr-4">Status</th>
                        {canEdit && <th className="pb-2 font-medium">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {attendanceRecords.map((a: any) => (
                        <tr key={a.id}>
                          <td className="py-2 pr-4 font-medium">{a.user.name}</td>
                          <td className="py-2 pr-4 font-mono text-xs text-gray-400">
                            {a.user.studentNumber ?? "-"}
                          </td>
                          <td className="py-2 pr-4">
                            {a.markedPresent ? (
                              <span className="badge badge-success text-xs">Present</span>
                            ) : (
                              <span className="badge badge-danger text-xs">Absent</span>
                            )}
                          </td>
                          {canEdit && (
                            <td className="py-2">
                              <button
                                onClick={() => onEdit(a)}
                                className="btn-secondary text-xs px-2 py-1"
                              >
                                Edit
                              </button>
                            </td>
                          )}
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
  );
}

function ByCourseView({ data }: any) {
  const { courses, selectedCourseId, attendanceStats } = data;

  // Group by student
  const studentStats = new Map<string, any>();
  attendanceStats?.forEach((a: any) => {
    if (!studentStats.has(a.user.id)) {
      studentStats.set(a.user.id, {
        id: a.user.id,
        name: a.user.name,
        studentNumber: a.user.studentNumber,
        totalClasses: 0,
        presentCount: 0,
      });
    }
    const stats = studentStats.get(a.user.id)!;
    stats.totalClasses++;
    if (a.markedPresent) stats.presentCount++;
  });

  const studentList = Array.from(studentStats.values()).map((s) => ({
    ...s,
    attendanceRate: s.totalClasses > 0 ? (s.presentCount / s.totalClasses) * 100 : 0,
  }));

  return (
    <div className="grid lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1">
        <h2 className="font-semibold text-sm mb-3 text-gray-500 uppercase tracking-wide">
          Courses
        </h2>
        {!courses || courses.length === 0 ? (
          <p className="text-gray-400 text-sm">No courses with attendance.</p>
        ) : (
          <div className="space-y-2">
            {courses.map((c: any) => (
              <a
                key={c.id}
                href={`/principal/attendance?view=by-course&courseId=${c.id}`}
                className={`block rounded-xl px-3 py-2.5 text-sm no-underline transition-colors ${
                  selectedCourseId === c.id
                    ? "bg-primary text-white"
                    : "hover:bg-surface border border-border"
                }`}
              >
                <p className="font-medium">{c.title}</p>
                <p
                  className={`text-xs ${
                    selectedCourseId === c.id ? "text-white/70" : "text-gray-400"
                  }`}
                >
                  {c.courseCode}
                </p>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-3">
        {!selectedCourseId ? (
          <div className="card text-center py-16">
            <p className="text-gray-400 text-sm">Select a course to view attendance</p>
          </div>
        ) : studentList.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-gray-400 text-sm">No attendance records for this course</p>
          </div>
        ) : (
          <div className="card">
            <h2 className="font-semibold mb-4">Student Attendance Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-border">
                    <th className="pb-2 font-medium pr-4">Student</th>
                    <th className="pb-2 font-medium pr-4">Student No.</th>
                    <th className="pb-2 font-medium pr-4 text-right">Classes</th>
                    <th className="pb-2 font-medium pr-4 text-right">Present</th>
                    <th className="pb-2 font-medium text-right">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {studentList.map((s: any) => (
                    <tr key={s.id}>
                      <td className="py-2 pr-4 font-medium">{s.name}</td>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-400">
                        {s.studentNumber ?? "-"}
                      </td>
                      <td className="py-2 pr-4 text-right">{s.totalClasses}</td>
                      <td className="py-2 pr-4 text-right">{s.presentCount}</td>
                      <td className="py-2 text-right">
                        <span
                          className={`font-medium ${
                            s.attendanceRate >= 75
                              ? "text-green-600"
                              : s.attendanceRate >= 50
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {s.attendanceRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ByInstructorView({ data }: any) {
  const { instructors, selectedInstructorId, attendanceStats } = data;

  // Group by student
  const studentStats = new Map<string, any>();
  attendanceStats?.forEach((a: any) => {
    if (!studentStats.has(a.user.id)) {
      studentStats.set(a.user.id, {
        id: a.user.id,
        name: a.user.name,
        studentNumber: a.user.studentNumber,
        totalClasses: 0,
        presentCount: 0,
      });
    }
    const stats = studentStats.get(a.user.id)!;
    stats.totalClasses++;
    if (a.markedPresent) stats.presentCount++;
  });

  const studentList = Array.from(studentStats.values()).map((s) => ({
    ...s,
    attendanceRate: s.totalClasses > 0 ? (s.presentCount / s.totalClasses) * 100 : 0,
  }));

  return (
    <div className="grid lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1">
        <h2 className="font-semibold text-sm mb-3 text-gray-500 uppercase tracking-wide">
          Instructors
        </h2>
        {!instructors || instructors.length === 0 ? (
          <p className="text-gray-400 text-sm">No instructors with classes.</p>
        ) : (
          <div className="space-y-2">
            {instructors.map((i: any) => (
              <a
                key={i.id}
                href={`/principal/attendance?view=by-instructor&instructorId=${i.id}`}
                className={`block rounded-xl px-3 py-2.5 text-sm no-underline transition-colors ${
                  selectedInstructorId === i.id
                    ? "bg-primary text-white"
                    : "hover:bg-surface border border-border"
                }`}
              >
                <p className="font-medium">{i.name}</p>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-3">
        {!selectedInstructorId ? (
          <div className="card text-center py-16">
            <p className="text-gray-400 text-sm">Select an instructor to view attendance</p>
          </div>
        ) : studentList.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-gray-400 text-sm">No attendance records for this instructor</p>
          </div>
        ) : (
          <div className="card">
            <h2 className="font-semibold mb-4">Student Attendance Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-border">
                    <th className="pb-2 font-medium pr-4">Student</th>
                    <th className="pb-2 font-medium pr-4">Student No.</th>
                    <th className="pb-2 font-medium pr-4 text-right">Classes</th>
                    <th className="pb-2 font-medium pr-4 text-right">Present</th>
                    <th className="pb-2 font-medium text-right">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {studentList.map((s: any) => (
                    <tr key={s.id}>
                      <td className="py-2 pr-4 font-medium">{s.name}</td>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-400">
                        {s.studentNumber ?? "-"}
                      </td>
                      <td className="py-2 pr-4 text-right">{s.totalClasses}</td>
                      <td className="py-2 pr-4 text-right">{s.presentCount}</td>
                      <td className="py-2 text-right">
                        <span
                          className={`font-medium ${
                            s.attendanceRate >= 75
                              ? "text-green-600"
                              : s.attendanceRate >= 50
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {s.attendanceRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ByStudentView({ data, canEdit, onEdit }: any) {
  const { students, selectedStudentId, attendanceRecords, attendanceRate } = data;

  return (
    <div className="grid lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1">
        <h2 className="font-semibold text-sm mb-3 text-gray-500 uppercase tracking-wide">
          Students ({students?.length || 0})
        </h2>
        {!students || students.length === 0 ? (
          <p className="text-gray-400 text-sm">No students with attendance.</p>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {students.map((s: any) => (
              <a
                key={s.id}
                href={`/principal/attendance?view=by-student&studentId=${s.id}`}
                className={`block rounded-xl px-3 py-2.5 text-sm no-underline transition-colors ${
                  selectedStudentId === s.id
                    ? "bg-primary text-white"
                    : "hover:bg-surface border border-border"
                }`}
              >
                <p className="font-medium">{s.name}</p>
                <p
                  className={`text-xs ${
                    selectedStudentId === s.id ? "text-white/70" : "text-gray-400"
                  }`}
                >
                  {s.studentNumber ?? "No number"}
                </p>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-3">
        {!selectedStudentId ? (
          <div className="card text-center py-16">
            <p className="text-gray-400 text-sm">Select a student to view attendance</p>
          </div>
        ) : !attendanceRecords || attendanceRecords.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-gray-400 text-sm">No attendance records for this student</p>
          </div>
        ) : (
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Attendance History</h2>
              <div className="text-right">
                <p className="text-2xl font-bold">{attendanceRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-400">Overall attendance</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-border">
                    <th className="pb-2 font-medium pr-4">Class</th>
                    <th className="pb-2 font-medium pr-4">Course</th>
                    <th className="pb-2 font-medium pr-4">Date</th>
                    <th className="pb-2 font-medium pr-4">Status</th>
                    {canEdit && <th className="pb-2 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {attendanceRecords.map((a: any) => (
                    <tr key={a.id}>
                      <td className="py-2 pr-4 font-medium">{a.liveClass.title}</td>
                      <td className="py-2 pr-4 text-xs text-gray-400">
                        {a.liveClass.course.title}
                      </td>
                      <td className="py-2 pr-4 text-xs">
                        {new Date(a.liveClass.scheduledAt).toLocaleDateString("en-UG")}
                      </td>
                      <td className="py-2 pr-4">
                        {a.markedPresent ? (
                          <span className="badge badge-success text-xs">Present</span>
                        ) : (
                          <span className="badge badge-danger text-xs">Absent</span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="py-2">
                          <button
                            onClick={() => onEdit({ ...a, user: students.find((s: any) => s.id === selectedStudentId) })}
                            className="btn-secondary text-xs px-2 py-1"
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LowAttendanceView({ data }: any) {
  const { lowAttendanceStudents, minimumAttendance, minimumClasses } = data;

  return (
    <div className="card">
      <div className="mb-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <span>⚠️</span> Students Below Minimum Attendance
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Students with less than {minimumAttendance}% attendance (minimum {minimumClasses} classes
          attended)
        </p>
      </div>

      {!lowAttendanceStudents || lowAttendanceStudents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-green-600 font-medium text-lg">✓ No students below threshold</p>
          <p className="text-sm text-gray-400 mt-2">
            All students are meeting the minimum attendance requirement
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Student</th>
                <th className="pb-2 font-medium pr-4">Student No.</th>
                <th className="pb-2 font-medium pr-4 text-right">Total Classes</th>
                <th className="pb-2 font-medium pr-4 text-right">Present</th>
                <th className="pb-2 font-medium pr-4 text-right">Absent</th>
                <th className="pb-2 font-medium text-right">Attendance Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lowAttendanceStudents.map((s: any) => (
                <tr key={s.id} className="hover:bg-surface">
                  <td className="py-3 pr-4 font-medium">{s.name}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-gray-400">
                    {s.studentNumber ?? "-"}
                  </td>
                  <td className="py-3 pr-4 text-right">{s.totalClasses}</td>
                  <td className="py-3 pr-4 text-right text-green-600 font-medium">
                    {s.presentCount}
                  </td>
                  <td className="py-3 pr-4 text-right text-red-600 font-medium">
                    {s.absentCount}
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-bold text-red-600">{s.attendanceRate.toFixed(1)}%</span>
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
