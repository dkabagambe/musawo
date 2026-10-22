"use client";

import { useState } from "react";
import { Mail, Phone, Search, Send } from "lucide-react";

type Student = {
  id: string;
  name: string;
  studentNumber: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  course: string | null;
  intake: string | null;
  pendingInvite: { id: string; expiresAt: string } | null;
};

export default function StudentLookup() {
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [searched, setSearched] = useState(false);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setSearched(true);
    const response = await fetch(
      `/api/admin/students/lookup?q=${encodeURIComponent(query)}`,
      { cache: "no-store" },
    );
    const data = (await response.json()) as {
      students?: Student[];
      error?: string;
    };
    if (!response.ok) {
      setStudents([]);
      setMessage(data.error ?? "Lookup failed.");
      return;
    }
    setStudents(data.students ?? []);
  }

  async function act(student: Student, action: "reset" | "resend") {
    setBusyId(student.id);
    setMessage("");
    try {
      const response =
        action === "reset"
          ? await fetch(`/api/admin/accounts/${student.id}/reset-password`, {
              method: "POST",
            })
          : await fetch(
              `/api/admin/staff-invite/${student.pendingInvite?.id}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "resend" }),
              },
            );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Action failed.");
      setMessage(
        action === "reset"
          ? `Reset link sent to ${student.email}.`
          : `Invitation resent to ${student.email}.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-4">
      <form className="flex max-w-2xl gap-2" onSubmit={search}>
        <label className="sr-only" htmlFor="front-desk-query">
          Student name or number
        </label>
        <input
          id="front-desk-query"
          className="input min-w-0 flex-1"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search full name or student number"
          minLength={2}
          maxLength={120}
          required
        />
        <button
          type="submit"
          className="btn-primary inline-flex items-center gap-2"
        >
          <Search className="h-4 w-4" aria-hidden="true" /> Search
        </button>
      </form>
      {message && (
        <p
          role="status"
          className="rounded border border-border bg-white p-3 text-sm"
        >
          {message}
        </p>
      )}
      {searched && students.length === 0 && !message && (
        <p className="text-sm text-gray-500">No matching students.</p>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {students.map((student) => (
          <article
            key={student.id}
            className="rounded-md border border-border bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-gray-900">
                  {student.name}
                </h2>
                <p className="mt-1 font-mono text-xs text-gray-500">
                  {student.studentNumber ?? "Number pending"}
                </p>
              </div>
              <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">
                {student.status.replaceAll("_", " ")}
              </span>
            </div>
            <dl className="mt-3 grid gap-2 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <dt>
                  <Mail className="h-4 w-4 text-teal-700" aria-label="Email" />
                </dt>
                <dd>{student.email ?? "No email"}</dd>
              </div>
              <div className="flex items-center gap-2">
                <dt>
                  <Phone className="h-4 w-4 text-teal-700" aria-label="Phone" />
                </dt>
                <dd>{student.phone ?? "No phone"}</dd>
              </div>
              <div>
                <dt className="inline text-gray-500">Course: </dt>
                <dd className="inline">{student.course ?? "Not assigned"}</dd>
              </div>
              <div>
                <dt className="inline text-gray-500">Intake: </dt>
                <dd className="inline">{student.intake ?? "Not assigned"}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {student.pendingInvite && (
                <button
                  type="button"
                  className="btn-secondary inline-flex items-center gap-2 text-sm"
                  onClick={() => void act(student, "resend")}
                  disabled={busyId === student.id}
                >
                  <Send className="h-4 w-4" aria-hidden="true" /> Resend invite
                </button>
              )}
              <button
                type="button"
                className="btn-secondary inline-flex items-center gap-2 text-sm"
                onClick={() => void act(student, "reset")}
                disabled={busyId === student.id || !student.email}
              >
                <Mail className="h-4 w-4" aria-hidden="true" /> Send password
                reset
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
