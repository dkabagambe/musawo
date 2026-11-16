"use client";

/**
 * Director-specific approval decision form.
 *
 * Actions:
 *   APPROVED  - approve the request (comment required)
 *   REJECTED  - reject the request (comment required)
 *   SEND_BACK - return to initiator for changes (comment required)
 *
 * When the API returns code "REAUTH_REQUIRED" the form redirects to
 * /director/reauth?next=<current-path> so the Director can re-verify
 * their TOTP before continuing.
 */

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

type Action = "APPROVED" | "REJECTED" | "SEND_BACK" | "";

interface Props {
  requestId:     string;
  initiatorId:   string;
  currentUserId: string;
}

export default function DirectorDecisionForm({ requestId, initiatorId, currentUserId }: Props) {
  const router   = useRouter();
  const pathname = usePathname();

  const [action, setAction]   = useState<Action>("");
  const [note, setNote]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState(false);
  const [outcome, setOutcome] = useState<Action>("");

  const isSelf = initiatorId === currentUserId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!action) { setError("Choose a decision."); return; }
    if (!note.trim() || note.trim().length < 5) {
      setError("A comment of at least 5 characters is required.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const body =
        action === "SEND_BACK"
          ? { action: "SEND_BACK", decisionNote: note }
          : { decision: action, decisionNote: note };

      const res = await fetch(`/api/approvals/${requestId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });

      const data = await res.json() as {
        ok?: boolean;
        error?: string;
        code?: string;
      };

      if (!res.ok) {
        // Re-auth required: redirect to reauth page, return here after
        if (data.code === "REAUTH_REQUIRED") {
          const next = encodeURIComponent(pathname ?? `/director/approvals/${requestId}`);
          router.push(`/director/reauth?next=${next}`);
          return;
        }
        setError(data.error ?? "Failed to submit decision.");
        return;
      }

      setOutcome(action);
      setDone(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (isSelf) {
    return (
      <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3">
        <p className="text-amber-800 text-sm font-medium">
          You cannot approve or reject your own request.
        </p>
      </div>
    );
  }

  if (done) {
    const label =
      outcome === "APPROVED"  ? "Approved" :
      outcome === "REJECTED"  ? "Rejected" :
      "Sent back for changes";

    return (
      <div className="bg-success/10 border border-success/20 rounded-xl px-4 py-3 text-center space-y-2">
        <p className="text-green-800 font-semibold">{label}. The initiator has been notified.</p>
        <a href="/director/approvals" className="text-sm text-accent underline inline-block">
          Back to inbox
        </a>
      </div>
    );
  }

  const ACTION_STYLES: Record<string, string> = {
    APPROVED:  "border-success bg-success/10 text-green-800",
    REJECTED:  "border-danger bg-danger/10 text-danger",
    SEND_BACK: "border-amber-500 bg-amber-50 text-amber-800",
  };
  const IDLE_STYLES: Record<string, string> = {
    APPROVED:  "border-border hover:border-success",
    REJECTED:  "border-border hover:border-danger",
    SEND_BACK: "border-border hover:border-amber-500",
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && (
        <div role="alert" className="flex items-start gap-2 bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {(["APPROVED", "REJECTED", "SEND_BACK"] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAction(a)}
            className={`py-3 rounded-xl border-2 font-semibold text-sm transition-colors ${
              action === a ? ACTION_STYLES[a] : IDLE_STYLES[a]
            }`}
          >
            {a === "APPROVED"  ? "Approve" :
             a === "REJECTED"  ? "Reject" :
             "Send back"}
          </button>
        ))}
      </div>

      {action && (
        <p className="text-xs text-gray-500">
          {action === "APPROVED"  && "Approving will apply the decision immediately and notify the initiator."}
          {action === "REJECTED"  && "Rejecting will close the request. The initiator will see your comment."}
          {action === "SEND_BACK" && "The request will be returned to the initiator with your comment so they can revise it."}
        </p>
      )}

      <div>
        <label htmlFor="decision-note" className="label">
          Comment <span className="text-danger" aria-hidden="true">*</span>
        </label>
        <textarea
          id="decision-note"
          rows={3}
          required
          minLength={5}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="input resize-none"
          placeholder={
            action === "SEND_BACK"
              ? "Explain what needs to be changed..."
              : action === "REJECTED"
              ? "Explain the reason for rejection..."
              : "Explain the basis for this decision..."
          }
        />
      </div>

      <button
        type="submit"
        disabled={loading || !action}
        className="btn-primary w-full"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            Submitting...
          </span>
        ) : (
          action === "APPROVED"  ? "Confirm approval" :
          action === "REJECTED"  ? "Confirm rejection" :
          action === "SEND_BACK" ? "Send back for changes" :
          "Submit decision"
        )}
      </button>
    </form>
  );
}
