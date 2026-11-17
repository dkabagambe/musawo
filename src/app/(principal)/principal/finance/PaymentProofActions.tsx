"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  proofId: string;
  initiatorName: string;
};

export default function PaymentProofActions({ proofId, initiatorName }: Props) {
  const router = useRouter();
  const [showForward, setShowForward] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleForward() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/principal/finance/proofs/${proofId}/forward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: comment.trim() || undefined }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to forward");
        return;
      }
      router.refresh();
      setShowForward(false);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleReturn() {
    if (reason.trim().length < 10) {
      setError("Reason must be at least 10 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/principal/finance/proofs/${proofId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to return");
        return;
      }
      router.refresh();
      setShowReturn(false);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex gap-3 mt-4">
        <button
          type="button"
          className="btn-outline flex-1"
          onClick={() => {
            setShowReturn(true);
            setReason("");
            setError("");
          }}
        >
          Return to Admin
        </button>
        <button
          type="button"
          className="btn-primary flex-1"
          onClick={() => {
            setShowForward(true);
            setComment("");
            setError("");
          }}
        >
          Forward to Director
        </button>
      </div>

      {/* Forward Modal */}
      {showForward && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full">
            <h2 className="font-semibold text-base mb-3">Forward to Director</h2>
            <p className="text-sm text-gray-500 mb-4">
              From: <strong>{initiatorName}</strong>
            </p>
            {error && (
              <p className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-xl mb-3">
                {error}
              </p>
            )}
            <div className="mb-4">
              <label className="label">Comment (optional)</label>
              <textarea
                rows={3}
                className="input w-full resize-none"
                placeholder="Add a note for the Director..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={() => {
                  setShowForward(false);
                  setComment("");
                  setError("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={handleForward}
                disabled={loading}
              >
                {loading ? "Forwarding..." : "Forward"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full">
            <h2 className="font-semibold text-base mb-3">Return to Admin</h2>
            <p className="text-sm text-gray-500 mb-4">
              From: <strong>{initiatorName}</strong>
            </p>
            {error && (
              <p className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-xl mb-3">
                {error}
              </p>
            )}
            <div className="mb-4">
              <label className="label">
                Reason <span className="text-danger">*</span>
              </label>
              <textarea
                rows={4}
                className="input w-full resize-none"
                placeholder="Explain why this proof is being returned..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                minLength={10}
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                {reason.length} / 10 characters minimum
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={() => {
                  setShowReturn(false);
                  setReason("");
                  setError("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={handleReturn}
                disabled={loading || reason.trim().length < 10}
              >
                {loading ? "Returning..." : "Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
