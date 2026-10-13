"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

export default function AssignmentSubmitPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [text, setText]       = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState("");

  if (done) {
    return (
      <div className="max-w-2xl mx-auto card text-center py-12">
        <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" aria-hidden="true" />
        <h1 className="text-xl font-bold text-primary mb-2">Assignment submitted!</h1>
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
    if (!text.trim()) { setError("Please write your answer before submitting."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: params.id, textBody: text }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Submission failed."); return; }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/dashboard/assignments" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-6 no-underline">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to assignments
      </Link>
      <h1 className="text-2xl font-bold text-primary mb-6">Submit assignment</h1>

      {error && (
        <div role="alert" className="auth-banner-error mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="card p-6">
        <label htmlFor="answer" className="label">Your answer</label>
        <textarea
          id="answer"
          rows={12}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="input py-3 resize-y mb-4"
          placeholder="Type your answer here…"
          required
        />
        <p className="text-xs text-gray-400 mb-4">{text.length} characters</p>
        <button type="submit" disabled={loading} className="auth-btn-primary">
          {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {loading ? "Submitting…" : "Submit assignment"}
        </button>
      </form>
    </div>
  );
}
