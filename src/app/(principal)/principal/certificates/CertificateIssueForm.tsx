"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CourseOption {
  id: string;
  title: string;
}

interface Candidate {
  id: string;
  name: string;
  studentNumber: string | null;
  courses: CourseOption[];
}

interface Props {
  candidates: Candidate[];
}

export default function CertificateIssueForm({ candidates }: Props) {
  const router = useRouter();
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const student = candidates.find((c) => c.id === selectedStudent);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent || !selectedCourse) {
      setError("Select a student and course.");
      return;
    }
    setLoading(true);
    setError("");

    const fullReason = [
      `Certificate issuance request for: ${student?.name ?? selectedStudent}`,
      `Student number: ${student?.studentNumber ?? "N/A"}`,
      `Course: ${student?.courses.find((c) => c.id === selectedCourse)?.title ?? selectedCourse}`,
      reason.trim() ? `Notes: ${reason.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CERTIFICATE_ISSUANCE",
          reason: fullReason,
          studentId: selectedStudent,
          courseId: selectedCourse,
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to submit request.");
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="card text-center py-10">
        <p className="text-3xl mb-3">✅</p>
        <p className="text-green-800 font-semibold">Request submitted to Director for approval.</p>
        <button
          className="text-sm text-accent underline mt-3"
          onClick={() => { setSuccess(false); setSelectedStudent(""); setSelectedCourse(""); setReason(""); }}
        >
          Request another certificate
        </button>
      </div>
    );
  }

  return (
    <div className="card max-w-xl">
      <h2 className="font-semibold text-base mb-4">Request Certificate Issuance</h2>
      <p className="text-sm text-gray-500 mb-6">
        Select the student and course. The Director will approve the issuance.
      </p>

      {candidates.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">
            No students with passing exam results found who do not yet have certificates.
          </p>
        </div>
      )}

      {candidates.length > 0 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p role="alert" className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}

          <div>
            <label className="label">
              Student <span className="text-danger">*</span>
            </label>
            <select
              required
              className="input w-full"
              value={selectedStudent}
              onChange={(e) => { setSelectedStudent(e.target.value); setSelectedCourse(""); }}
            >
              <option value="">-- Select student --</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.studentNumber ? ` (${c.studentNumber})` : ""}
                </option>
              ))}
            </select>
          </div>

          {student && (
            <div>
              <label className="label">
                Course <span className="text-danger">*</span>
              </label>
              <select
                required
                className="input w-full"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="">-- Select course --</option>
                {student.courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              rows={2}
              className="input w-full resize-none"
              placeholder="Any additional notes for the Director..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !selectedStudent || !selectedCourse}
            className="btn-primary w-full"
          >
            {loading ? "Submitting..." : "Request certificate issuance"}
          </button>
        </form>
      )}
    </div>
  );
}
