"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ExamOption {
  examId: string;
  examTitle: string;
  courseName: string;
}

interface Props {
  examsWithResults: ExamOption[];
}

export default function ResultsPublicationForm({ examsWithResults }: Props) {
  const router = useRouter();
  const [selectedExam, setSelectedExam] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const exam = examsWithResults.find((e) => e.examId === selectedExam);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedExam) { setError("Select an exam."); return; }
    setLoading(true);
    setError("");

    const reason = [
      `Results publication request`,
      `Exam: ${exam?.examTitle ?? selectedExam}`,
      `Course: ${exam?.courseName ?? ""}`,
      notes.trim() ? `Admin notes: ${notes.trim()}` : "",
      `Submitted by Admin for Principal and Director approval.`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "RESULTS_PUBLICATION",
          reason,
          courseId: selectedExam,
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to submit.");
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
        <p className="text-green-800 font-semibold">
          Publication request submitted for Principal and Director approval.
        </p>
        <button
          className="text-sm text-accent underline mt-3"
          onClick={() => { setSuccess(false); setSelectedExam(""); setNotes(""); }}
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <div className="card max-w-xl">
      <h2 className="font-semibold text-base mb-4">Request Results Publication</h2>
      <p className="text-sm text-gray-500 mb-6">
        Submit a request for exam results to be published to students.
        The Principal reviews and the Director approves.
      </p>

      {examsWithResults.length === 0 ? (
        <p className="text-gray-400 text-sm">No exams with pending results found.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p role="alert" className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}
          <div>
            <label className="label">
              Exam <span className="text-danger">*</span>
            </label>
            <select
              required
              className="input w-full"
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
            >
              <option value="">-- Select exam --</option>
              {examsWithResults.map((e) => (
                <option key={e.examId} value={e.examId}>
                  {e.examTitle} - {e.courseName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              rows={3}
              className="input w-full resize-none"
              placeholder="Summary for the Principal and Director..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading || !selectedExam} className="btn-primary w-full">
            {loading ? "Submitting..." : "Submit for approval"}
          </button>
        </form>
      )}
    </div>
  );
}
