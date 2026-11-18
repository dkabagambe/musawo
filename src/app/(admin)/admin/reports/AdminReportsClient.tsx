"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";

type Course = {
  id: string;
  title: string;
  code: string;
};

type Intake = {
  id: string;
  year: number;
  semester: number;
};

interface Props {
  courses: Course[];
  intakes: Intake[];
}

type ReportType =
  | "students"
  | "registrations"
  | "classes"
  | "attendance"
  | "results"
  | "applications"
  | "documents";

export default function AdminReportsClient({ courses, intakes }: Props) {
  const [selectedReport, setSelectedReport] = useState<ReportType>("students");
  const [courseFilter, setCourseFilter] = useState("");
  const [intakeFilter, setIntakeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleExport(format: "csv" | "pdf") {
    setError("");
    setLoading(true);

    try {
      const params = new URLSearchParams({
        reportType: selectedReport,
        format,
        ...(courseFilter && { courseId: courseFilter }),
        ...(intakeFilter && { intakeId: intakeFilter }),
        ...(statusFilter && { status: statusFilter }),
      });

      const response = await fetch(`/api/admin/reports/export?${params}`);

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "Could not generate report");
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedReport}-report-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate report");
    } finally {
      setLoading(false);
    }
  }

  const reports: Array<{ value: ReportType; label: string; description: string }> = [
    {
      value: "students",
      label: "Student Lists",
      description: "All active students with registration details",
    },
    {
      value: "registrations",
      label: "Registration Reports",
      description: "Registrations by course and intake",
    },
    {
      value: "classes",
      label: "Class Lists",
      description: "Students allocated to each class",
    },
    {
      value: "attendance",
      label: "Attendance Summaries",
      description: "Attendance rates and students below minimum",
    },
    {
      value: "results",
      label: "Results Summaries",
      description: "Exam results and grade distributions",
    },
    {
      value: "applications",
      label: "Applications Funnel",
      description: "Application status breakdown and conversion rates",
    },
    {
      value: "documents",
      label: "Missing Documents",
      description: "Students with incomplete documentation",
    },
  ];

  const selectedReportDetails = reports.find((r) => r.value === selectedReport);

  return (
    <div className="space-y-6">
      {/* Report Type Selection */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Select Report Type</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {reports.map((report) => (
            <button
              key={report.value}
              type="button"
              onClick={() => setSelectedReport(report.value)}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                selectedReport === report.value
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className="font-semibold text-sm">{report.label}</p>
              <p className="text-xs text-gray-600 mt-1">{report.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <label className="label">
            Course
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="input"
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.title}
                </option>
              ))}
            </select>
          </label>

          <label className="label">
            Intake
            <select
              value={intakeFilter}
              onChange={(e) => setIntakeFilter(e.target.value)}
              className="input"
            >
              <option value="">All Intakes</option>
              {intakes.map((intake) => (
                <option key={intake.id} value={intake.id}>
                  {intake.year} Semester {intake.semester}
                </option>
              ))}
            </select>
          </label>

          {["students", "applications"].includes(selectedReport) && (
            <label className="label">
              Status
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                <option value="">All Statuses</option>
                {selectedReport === "students" && (
                  <>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="GRADUATED">Graduated</option>
                    <option value="SUSPENDED">Suspended</option>
                  </>
                )}
                {selectedReport === "applications" && (
                  <>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </>
                )}
              </select>
            </label>
          )}
        </div>
      </div>

      {/* Export */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Export Report</h2>

        {selectedReportDetails && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="font-medium text-blue-900">{selectedReportDetails.label}</p>
            <p className="text-sm text-blue-800 mt-1">
              {selectedReportDetails.description}
            </p>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200 mb-4"
          >
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleExport("csv")}
            disabled={loading}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {loading ? "Generating..." : "Export CSV"}
          </button>
          <button
            type="button"
            onClick={() => handleExport("pdf")}
            disabled={loading}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            {loading ? "Generating..." : "Export PDF"}
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Note: All exports are audit logged with timestamp, user, and filter criteria.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-2xl font-semibold text-primary">
              {courses.length}
            </p>
            <p className="text-sm text-gray-600 mt-1">Active Courses</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-2xl font-semibold text-primary">
              {intakes.length}
            </p>
            <p className="text-sm text-gray-600 mt-1">Total Intakes</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-2xl font-semibold text-primary">
              {reports.length}
            </p>
            <p className="text-sm text-gray-600 mt-1">Report Types</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-2xl font-semibold text-primary">2</p>
            <p className="text-sm text-gray-600 mt-1">Export Formats</p>
          </div>
        </div>
      </div>
    </div>
  );
}
