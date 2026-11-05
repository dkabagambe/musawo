"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface Props {
  assignmentId: string;
  existingSubmission?: { textBody: string | null; status: string } | null;
}

export default function AssignmentSubmitForm({ assignmentId, existingSubmission }: Props) {
  const router = useRouter();
  const [text, setText]       = useState(existingSubmission?.textBody ?? "");
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState("");

  const alreadySubmitted =
    existingSubmission != null && existingSubmission.status !== "DRAFT";

  if (done) {
    return (
      <div className="card text-center py-12">
        <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" aria-hidden="true" />
        <h2 className="text-xl font-bold text-primary mb-2">Assignment submitted!</h2>
        <p className="text-sm text-gray-500 mb-6">
          Your tutor will review and grade it. You&apos;ll see the result in your Gradebook.
        </p>
        <Link href="/dashboard/assignments" className="btn-secondary no-underline text-sm">
          Back to assignments
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError("Please write your answer before submitting.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/assignments", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ assignmentId, textBody: text }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Submission failed.");
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6">
      {alreadySubmitted && (
        <div className="bg-info/10 border border-info/20 text-sm text-blue-800 rounded-xl px-4 py-3 mb-4">
          You already submitted this assignment. You can update your answer before the deadline.
        </div>
      )}

      {error && (
        <div role="alert" className="auth-banner-error mb-4">
          {error}
        </div>
      )}

      <label htmlFor="answer" className="label">Your answer</label>
      <textarea
        id="answer"
        rows={12}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="input py-3 resize-y mb-2"
        placeholder="Type your answer here…"
        required
      />
      <p className="text-xs text-gray-400 mb-4">{text.length} characters</p>

      <button type="submit" disabled={loading} className="auth-btn-primary">
        {loading && (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        )}
        {loading ? "Submitting…" : alreadySubmitted ? "Update submission" : "Submit assignment"}
      </button>
    </form>
  );
}
