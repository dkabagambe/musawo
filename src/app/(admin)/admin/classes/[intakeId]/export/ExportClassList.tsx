"use client";

import { useState } from "react";

type Student = {
  id: string;
  registrationNumber: string | null;
  name: string;
  email: string;
  phone: string | null;
  status: string;
};

type Props = {
  intakeId: string;
  intakeLabel: string;
  courseCode: string;
  students: Student[];
};

export default function ExportClassList({
  intakeId,
  intakeLabel,
  courseCode,
  students,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<"csv" | "pdf">("csv");
  const [includeContact, setIncludeContact] = useState(false);

  const handleExport = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/classes/${intakeId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          includeContact,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Export failed");
      }

      // Download the file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `class-list-${courseCode}-${intakeLabel.replace(/\s+/g, "-")}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      alert(error.message || "Failed to export");
    } finally {
      setLoading(false);
    }
  };

  const generateCSV = () => {
    const headers = includeContact
      ? ["Reg. Number", "Name", "Email", "Phone", "Status"]
      : ["Reg. Number", "Name", "Status"];

    const rows = students.map((s) =>
      includeContact
        ? [
            s.registrationNumber || "N/A",
            s.name,
            s.email,
            s.phone || "N/A",
            s.status,
          ]
        : [s.registrationNumber || "N/A", s.name, s.status],
    );

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `class-list-${courseCode}-${intakeLabel.replace(/\s+/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    // Log the export
    fetch(`/api/admin/classes/${intakeId}/export-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: "csv",
        includeContact,
        count: students.length,
      }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="font-semibold mb-4">Export Options</h2>

        <div className="space-y-4">
          <div>
            <label className="label">Format</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={format === "csv"}
                  onChange={(e) => setFormat(e.target.value as "csv")}
                  disabled={loading}
                />
                <span>CSV (Excel)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={format === "pdf"}
                  onChange={(e) => setFormat(e.target.value as "pdf")}
                  disabled={loading}
                />
                <span>PDF (Coming soon)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeContact}
                onChange={(e) => setIncludeContact(e.target.checked)}
                disabled={loading}
              />
              <span>Include contact information (email and phone)</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Contact details are sensitive. Only include if necessary for your purpose.
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Preview</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 pr-4">Reg. Number</th>
                <th className="pb-2 pr-4">Name</th>
                {includeContact && <th className="pb-2 pr-4">Email</th>}
                {includeContact && <th className="pb-2 pr-4">Phone</th>}
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.slice(0, 10).map((student) => (
                <tr key={student.id}>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {student.registrationNumber || "N/A"}
                  </td>
                  <td className="py-2 pr-4">{student.name}</td>
                  {includeContact && (
                    <td className="py-2 pr-4 text-gray-500">{student.email}</td>
                  )}
                  {includeContact && (
                    <td className="py-2 pr-4 text-gray-500">
                      {student.phone || "N/A"}
                    </td>
                  )}
                  <td className="py-2">
                    <span className="badge badge-sm">{student.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {students.length > 10 && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Showing 10 of {students.length} students
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={format === "csv" ? generateCSV : handleExport}
          disabled={loading || (format === "pdf")}
          className="btn btn-primary"
        >
          {loading ? "Exporting..." : `Export ${students.length} Students`}
        </button>
        <Link href={`/admin/classes/${intakeId}`} className="btn btn-outline">
          Cancel
        </Link>
      </div>

      <div className="card bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Note:</strong> This export will be audit logged with your user ID,
          timestamp, and the number of records exported. Handle exported data securely
          and in compliance with data protection policies.
        </p>
      </div>
    </div>
  );
}
