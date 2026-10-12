"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  requestId:     string;
  initiatorId:   string;
  currentUserId: string;
}

export default function ApprovalDecisionForm({ requestId, initiatorId, currentUserId }: Props) {
  const router = useRouter();
  const [decision, setDecision]   = useState<"APPROVED" | "REJECTED" | "">("");
  const [note, setNote]           = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [done, setDone]           = useState(false);

  const isSelf = initiatorId === currentUserId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!decision) { setError("Select a decision."); return; }
    if (!note.trim()) { setError("A comment is required."); return; }
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/approvals/${requestId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ decision, decisionNote: note }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to submit decision.");
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (isSelf) {
    return (
      <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3">
        <p className="text-amber-800 text-sm font-medium">⚠️ You cannot approve your own request.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-success/10 border border-success/20 rounded-xl px-4 py-3 text-center">
        <p className="text-green-800 font-semibold">Decision recorded. ✅</p>
        <a href="/director/approvals" className="text-sm text-accent underline mt-2 inline-block">
          Back to inbox
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <button
          type="button"
          onClick={() => setDecision("APPROVED")}
          className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-colors ${
            decision === "APPROVED"
              ? "border-success bg-success/10 text-green-800"
              : "border-border hover:border-success"
          }`}
        >
          ✅ Approve
        </button>
        <button
          type="button"
          onClick={() => setDecision("REJECTED")}
          className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-colors ${
            decision === "REJECTED"
              ? "border-danger bg-danger/10 text-danger"
              : "border-border hover:border-danger"
          }`}
        >
          ❌ Reject
        </button>
      </div>

      <div className="mb-4">
        <label htmlFor="note" className="label">
          Comment <span className="text-danger">*</span>
        </label>
        <textarea
          id="note"
          rows={3}
          required
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="input resize-none"
          placeholder="Explain your decision…"
        />
      </div>

      <button type="submit" disabled={loading || !decision} className="btn-primary w-full">
        {loading ? "Submitting…" : "Submit decision"}
      </button>
    </form>
  );
}
