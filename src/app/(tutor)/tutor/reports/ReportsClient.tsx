"use client";

import { Download } from "lucide-react";

type Totals = {
  students: number;
  active: number;
  completions: number;
  upcomingClasses: number;
  attendanceRecords: number;
  examAttempts: number;
  assignments: number;
  assignmentSubmissions: number;
};

type CourseStats = {
  id: string;
  title: string;
  enrolled: number;
  completed: number;
  completionRate: number;
  totalClasses: number;
  attendanceRecords: number;
  assignments: number;
  submissionsTotal: number;
  examAttempts: number;
  passRate: number | null;
};

export default function ReportsClient({
  totals,
  perCourse,
}: {
  totals: Totals;
  perCourse: CourseStats[];
}) {
  function exportCSV() {
    const cols = [
      "Course", "Enrolled", "Completed", "Completion %",
      "Classes held", "Attendance records", "Assignments",
      "Assignment submissions", "Exam attempts", "Pass rate %",
    ];
    const dataRows = perCourse.map((c) => [
      c.title,
      c.enrolled,
      c.completed,
      c.completionRate,
      c.totalClasses,
      c.attendanceRecords,
      c.assignments,
      c.submissionsTotal,
      c.examAttempts,
      c.passRate ?? "N/A",
    ]);
    const csv = [cols, ...dataRows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reports.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const globalStats = [
    { label: "Total students", value: totals.students },
    { label: "Active enrolments", value: totals.active },
    { label: "Completions", value: totals.completions },
    { label: "Upcoming classes", value: totals.upcomingClasses },
    { label: "Attendance records", value: totals.attendanceRecords },
    { label: "Exam attempts", value: totals.examAttempts },
    { label: "Assignments", value: totals.assignments },
    { label: "Assignment submissions", value: totals.assignmentSubmissions },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Summary across {perCourse.length} course{perCourse.length !== 1 ? "s" : ""}</p>
        </div>
        {perCourse.length > 0 && (
          <button
            onClick={exportCSV}
            className="btn-outline text-sm flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        )}
      </div>

      {/* Global stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {globalStats.map((s) => (
          <div key={s.label} className="card text-center py-5">
            <p className="text-2xl font-bold text-primary">{s.value.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Per-course breakdown */}
      {perCourse.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Per-course breakdown</h2>
          <div className="space-y-5">
            {perCourse.map((c) => (
              <div key={c.id} className="card space-y-4">
                <h3 className="font-bold text-primary">{c.title}</h3>

                {/* Bar charts using CSS */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Completion rate */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Course completion</span>
                      <span className="font-semibold">{c.completionRate}%</span>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${c.completionRate}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{c.completed} of {c.enrolled} students completed</p>
                  </div>

                  {/* Exam pass rate */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Exam pass rate</span>
                      <span className="font-semibold">{c.passRate != null ? `${c.passRate}%` : "N/A"}</span>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`rounded-full h-2 transition-all ${c.passRate != null && c.passRate >= 70 ? "bg-success" : c.passRate != null ? "bg-amber-500" : "bg-gray-200"}`}
                        style={{ width: `${c.passRate ?? 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{c.examAttempts} attempts</p>
                  </div>
                </div>

                {/* Quick stats row */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-2 border-t border-border">
                  {[
                    { label: "Enrolled", value: c.enrolled },
                    { label: "Classes held", value: c.totalClasses },
                    { label: "Attendance", value: c.attendanceRecords },
                    { label: "Assignments", value: c.assignments },
                    { label: "Submissions", value: c.submissionsTotal },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <p className="text-lg font-bold text-primary">{s.value}</p>
                      <p className="text-xs text-gray-500">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
