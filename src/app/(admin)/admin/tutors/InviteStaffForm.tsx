"use client";

import { useState, useRef } from "react";
interface Props {
  courses: Array<{ id: string; title: string }>;
  roleLabels: Record<string, string>;
}

const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "INSTRUCTOR",         label: "Instructor / Teaching Staff" },
  { value: "TEACHING_ASSISTANT", label: "Teaching Assistant / Supporting Staff" },
  { value: "ACADEMIC_REGISTRAR", label: "Academic Registrar" },
  { value: "PRINCIPAL",          label: "Principal" },
  { value: "DEPUTY_PRINCIPAL",   label: "Deputy Principal" },
  { value: "FINANCE_OFFICER",    label: "Finance Officer" },
  { value: "HR_SYSTEM_ADMIN",    label: "Human Resource and Administrator" },
  { value: "SYSTEM_IT",          label: "System IT" },
];

export default function InviteStaffForm({ courses, roleLabels }: Props) {
  const [tab, setTab] = useState<"single" | "csv">("single");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("INSTRUCTOR");
  const [courseId, setCourseId] = useState("");
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ email: string; ok: boolean; error?: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const roleOptions = ROLE_OPTIONS;

  async function submit(invites: Array<{ email: string; role: string; courseId?: string }>) {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const body = invites.length === 1 ? invites[0] : { invites };
      const res = await fetch("/api/admin/staff-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        results?: Array<{ email: string; ok: boolean; error?: string }>;
        error?: string;
      };
      if (data.results) {
        setResults(data.results);
      } else {
        setError(data.error ?? "Unknown error");
      }
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }

  function handleSingle(e: React.FormEvent) {
    e.preventDefault();
    void submit([{ email, role, courseId: courseId || undefined }]);
  }

  function handleCsv(e: React.FormEvent) {
    e.preventDefault();
    const lines = csvText.split("\n").map((l) => l.trim()).filter(Boolean);
    const invites = lines.flatMap((line) => {
      const parts = line.split(",").map((p) => p.trim());
      const csvEmail = parts[0];
      const csvRole = parts[1] ?? "INSTRUCTOR";
      if (!csvEmail) return [];
      return [{ email: csvEmail, role: csvRole }];
    });
    if (invites.length === 0) { setError("No valid rows found"); return; }
    void submit(invites);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n");
      const start = lines[0]?.toLowerCase().includes("email") ? 1 : 0;
      setCsvText(lines.slice(start).join("\n"));
    };
    reader.readAsText(file);
  }

  return (
    <section className="card">
      <h2 className="font-semibold text-lg mb-4">Invite staff</h2>

      <div className="flex gap-2 mb-5">
        {(["single", "csv"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "bg-primary text-white" : "bg-surface text-gray-600 hover:bg-border"
            }`}
            onClick={() => setTab(t)}
          >
            {t === "single" ? "Single invite" : "Bulk CSV"}
          </button>
        ))}
      </div>

      {tab === "single" && (
        <form onSubmit={handleSingle} className="space-y-4 max-w-md">
          <div>
            <label className="label" htmlFor="invite-email">Email address</label>
            <input
              id="invite-email"
              type="email"
              className="input w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="staff@example.com"
            />
          </div>
          <div>
            <label className="label" htmlFor="invite-role">Role</label>
            <select
              id="invite-role"
              className="input w-full"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>{roleLabels[r.value] ?? r.label}</option>
              ))}
            </select>
          </div>
          {(role === "INSTRUCTOR" || role === "TEACHING_ASSISTANT") && courses.length > 0 && (
            <div>
              <label className="label" htmlFor="invite-course">Assign to course (optional)</label>
              <select
                id="invite-course"
                className="input w-full"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              >
                <option value="">No course selected</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Sending..." : "Send invite"}
          </button>
        </form>
      )}

      {tab === "csv" && (
        <form onSubmit={handleCsv} className="space-y-4 max-w-lg">
          <p className="text-sm text-gray-500">
            Upload a CSV with columns: <code className="bg-surface px-1 rounded">email, role</code>. Role defaults to INSTRUCTOR if omitted. Maximum 50 rows.
          </p>
          <div>
            <label className="label" htmlFor="csv-file">Upload CSV file</label>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              className="input w-full text-sm"
              ref={fileRef}
              onChange={handleFileChange}
            />
          </div>
          <div>
            <label className="label" htmlFor="csv-text">Or paste CSV rows</label>
            <textarea
              id="csv-text"
              className="input w-full font-mono text-xs"
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            placeholder={"grace@example.com,INSTRUCTOR\nsamuel@example.com,ACADEMIC_REGISTRAR"}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Sending..." : "Send invites"}
          </button>
        </form>
      )}

      {error && (
        <div className="mt-4 bg-danger/10 border border-danger/20 rounded-xl p-3 text-danger text-sm">
          {error}
        </div>
      )}

      {results && (
        <div className="mt-4 space-y-1.5">
          {results.map((r) => (
            <div
              key={r.email}
              className={`flex items-center gap-3 text-sm px-3 py-2 rounded-lg ${
                r.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
              }`}
            >
              <span className="font-medium">{r.email}</span>
              <span>{r.ok ? "Invite sent" : r.error}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
