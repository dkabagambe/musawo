"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  requestId:     string;
  initiatorId:   string;
  currentUserId: string;
  /** If true, Principal is the final approver and sees Approve/Reject in addition to Forward */
  canDecide:     boolean;
}

export default function ApprovalForwardForm({
  requestId,
  initiatorId,
  currentUserId,
  canDecide,
}: Props) {
  const router = useRouter();
  const [mode, setMode]         = useState<"forward" | "decide" | null>(null);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | "">("");
  const [note, setNote]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [done, setDone]         = useState(false);
  const [doneLabel, setDoneLabel] = useState("");

  const isSelf = initiatorId === currentUserId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let body: Record<string, unknown>;

      if (mode === "forward") {
        body = { action: "FORWARD", reviewNote: note || undefined };
      } else {
        if (!decision) { setError("Select a decision."); setLoading(false); return; }
        body = { decision, decisionNote: note };
      }

      const res = await fetch(`/api/approvals/${requestId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to submit.");
        return;
      }

      setDoneLabel(
        mode === "forward"
          ? "Forwarded to Director."
          : decision === "APPROVED"
          ? "Approved."
          : "Rejected."
      );
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
        <p className="text-amber-800 text-sm font-medium">
          You cannot action your own request.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-success/10 border border-success/20 rounded-xl px-4 py-3 text-center">
        <p className="text-green-800 font-semibold">{doneLabel} Done.</p>
        <a
          href="/principal/approvals-inbox"
          className="text-sm text-accent underline mt-2 inline-block"
        >
          Back to inbox
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Mode selector */}
      {mode === null && (
        <div className={`flex gap-3 ${canDecide ? "flex-col sm:flex-row" : ""}`}>
          <button
            type="button"
            onClick={() => setMode("forward")}
            className="flex-1 py-3 rounded-xl border-2 border-border hover:border-primary font-semibold text-sm transition-colors"
          >
            Forward to Director
          </button>
          {canDecide && (
            <>
              <button
                type="button"
                onClick={() => { setMode("decide"); setDecision("APPROVED"); }}
                className="flex-1 py-3 rounded-xl border-2 border-border hover:border-success font-semibold text-sm transition-colors"
              >
                Approve directly
              </button>
              <button
                type="button"
                onClick={() => { setMode("decide"); setDecision("REJECTED"); }}
                className="flex-1 py-3 rounded-xl border-2 border-border hover:border-danger font-semibold text-sm transition-colors"
              >
                Reject
              </button>
            </>
          )}
        </div>
      )}

      {/* Form */}
      {mode !== null && (
        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div
              role="alert"
              className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3 mb-4"
            >
              {error}
            </div>
          )}

          {/* Decide mode: show approve / reject toggle */}
          {mode === "decide" && (
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
                Approve
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
                Reject
              </button>
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="note" className="label">
              {mode === "forward" ? "Review note (optional)" : "Comment"}{" "}
              {mode === "decide" && <span className="text-danger">*</span>}
            </label>
            <textarea
              id="note"
              rows={3}
              required={mode === "decide"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input resize-none"
              placeholder={
                mode === "forward"
                  ? "Optional notes for the Director…"
                  : "Explain your decision…"
              }
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setMode(null); setDecision(""); setNote(""); setError(""); }}
              className="btn-secondary flex-1"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || (mode === "decide" && (!decision || !note.trim()))}
              className="btn-primary flex-1"
            >
              {loading
                ? "Submitting…"
                : mode === "forward"
                ? "Forward to Director"
                : decision === "APPROVED"
                ? "Approve"
                : "Reject"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
