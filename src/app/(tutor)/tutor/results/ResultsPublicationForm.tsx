"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ExamOption {
  examId: string;
  examTitle: string;
  courseName: string;
  submissionCount: number;
}

interface Props {
  exams: ExamOption[];
}

export default function InstructorResultsPublicationForm({ exams }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const exam = exams.find((e) => e.examId === selectedExam);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedExam) { setError("Select an exam."); return; }
    setLoading(true);
    setError("");

    const reason = [
      `Results publication request`,
      `Exam: ${exam?.examTitle ?? selectedExam}`,
      `Course: ${exam?.courseName ?? ""}`,
      `Submissions: ${exam?.submissionCount ?? 0}`,
      notes.trim() ? `Instructor notes: ${notes.trim()}` : "",
      `Submitted by Instructor for Admin processing, then Principal and Director approval.`,
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
      <div className="card text-center py-8">
        <p className="text-3xl mb-3">✅</p>
        <p className="text-green-800 font-semibold text-sm">
          Publication request submitted. The Admin will process it, then forward to Principal and Director for approval.
        </p>
        <button
          className="text-xs text-accent underline mt-3"
          onClick={() => { setSuccess(false); setSelectedExam(""); setNotes(""); setOpen(false); }}
        >
          Submit another request
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button className="btn-primary text-sm" onClick={() => setOpen(true)}>
        Request results publication
      </button>
    );
  }

  return (
    <div className="card max-w-xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-semibold text-base">Request Results Publication</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Submit for Admin processing, then Principal and Director approval.
          </p>
        </div>
        <button type="button" className="text-gray-400 hover:text-gray-600 text-xl leading-none" onClick={() => setOpen(false)}>
          &times;
        </button>
      </div>

      {exams.length === 0 ? (
        <p className="text-gray-400 text-sm py-4">No exams with submitted results found.</p>
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
              {exams.map((e) => (
                <option key={e.examId} value={e.examId}>
                  {e.examTitle} ({e.courseName}) - {e.submissionCount} submissions
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Notes for Admin (optional)</label>
            <textarea
              rows={3}
              className="input w-full resize-none"
              placeholder="Any grading notes for the Admin to include with the request..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button type="button" className="btn-ghost flex-1" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !selectedExam} className="btn-primary flex-1">
              {loading ? "Submitting..." : "Submit request"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
