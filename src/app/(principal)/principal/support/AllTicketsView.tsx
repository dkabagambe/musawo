"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Ticket = {
  id: string;
  subject: string;
  body: string;
  category: string;
  status: string;
  priority: string;
  user: {
    name: string;
    email: string | null;
  };
  replies: Array<{
    id: string;
    body: string;
    author: { name: string };
    createdAt: string;
    isStaff: boolean;
  }>;
  createdAt: string;
  assignedTo: { name: string } | null;
};

type Props = {
  tickets: Ticket[];
};

const STATUS_BADGE: Record<string, string> = {
  OPEN:        "badge-warning",
  IN_PROGRESS: "badge-info",
  RESOLVED:    "badge-success",
  CLOSED:      "badge-danger",
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW:    "badge-info",
  NORMAL: "badge-info",
  HIGH:   "badge-danger",
};

export default function AllTicketsView({ tickets }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [escalateModal, setEscalateModal] = useState<{ id: string; subject: string } | null>(null);
  const [commentModal, setCommentModal] = useState<{ id: string; subject: string } | null>(null);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleEscalate() {
    if (!escalateModal) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/principal/support/tickets/${escalateModal.id}/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to escalate");
        return;
      }
      setEscalateModal(null);
      setReason("");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleComment() {
    if (!commentModal || comment.trim().length < 3) {
      setError("Comment must be at least 3 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/principal/support/tickets/${commentModal.id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: comment.trim() }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to add comment");
        return;
      }
      setCommentModal(null);
      setComment("");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="space-y-3">
        {tickets.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-3xl mb-3">📭</p>
            <p className="text-gray-500 text-sm">No support tickets found.</p>
          </div>
        ) : (
          tickets.map((t) => (
            <div key={t.id} className="border border-border rounded-xl overflow-hidden">
              <button
                type="button"
                className="w-full flex items-start justify-between gap-4 p-4 text-left hover:bg-surface/50 transition-colors"
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm">{t.subject}</span>
                    <span className={`badge text-xs ${STATUS_BADGE[t.status] ?? "badge-info"}`}>
                      {t.status.replace(/_/g, " ")}
                    </span>
                    <span className={`badge text-xs ${PRIORITY_BADGE[t.priority] ?? "badge-info"}`}>
                      {t.priority}
                    </span>
                    <span className="text-xs text-gray-400">{t.category}</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {t.user.name} &middot;{" "}
                    {new Date(t.createdAt).toLocaleDateString("en-UG")}
                    {t.replies.length > 0 && ` - ${t.replies.length} repl${t.replies.length === 1 ? "y" : "ies"}`}
                    {t.assignedTo && ` - Assigned to: ${t.assignedTo.name}`}
                  </p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {expanded === t.id ? "Hide" : "Show"}
                </span>
              </button>
              {expanded === t.id && (
                <div className="border-t border-border p-4 space-y-3 bg-surface/30">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{t.body}</p>
                  {t.replies.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {t.replies.map((r) => (
                        <div
                          key={r.id}
                          className={`rounded-xl px-3 py-2 text-sm ${
                            r.isStaff
                              ? "bg-primary/10 border border-primary/20 ml-4"
                              : "bg-surface border border-border"
                          }`}
                        >
                          <p className="text-xs text-gray-400 mb-1">
                            {r.author.name} &middot; {new Date(r.createdAt).toLocaleDateString("en-UG")}
                            {r.isStaff && " (Staff)"}
                          </p>
                          <p className="text-gray-700 whitespace-pre-wrap">{r.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                    <button
                      type="button"
                      className="btn-ghost text-sm flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCommentModal({ id: t.id, subject: t.subject });
                        setComment("");
                        setError("");
                      }}
                    >
                      Add Comment
                    </button>
                    {t.status !== "CLOSED" && t.status !== "RESOLVED" && t.priority !== "HIGH" && (
                      <button
                        type="button"
                        className="btn-outline text-sm flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEscalateModal({ id: t.id, subject: t.subject });
                          setReason("");
                          setError("");
                        }}
                      >
                        🔺 Escalate
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Escalate Modal */}
      {escalateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full">
            <h2 className="font-semibold text-base mb-3">Escalate Ticket</h2>
            <p className="text-sm text-gray-500 mb-4">
              Ticket: <strong>{escalateModal.subject}</strong>
            </p>
            {error && (
              <p className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-xl mb-3">
                {error}
              </p>
            )}
            <div className="mb-4">
              <label className="label">Reason (optional)</label>
              <textarea
                rows={3}
                className="input w-full resize-none"
                placeholder="Explain why this ticket needs urgent attention..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={() => {
                  setEscalateModal(null);
                  setReason("");
                  setError("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={handleEscalate}
                disabled={loading}
              >
                {loading ? "Escalating..." : "Escalate to HIGH"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {commentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full">
            <h2 className="font-semibold text-base mb-3">Add Comment</h2>
            <p className="text-sm text-gray-500 mb-4">
              Ticket: <strong>{commentModal.subject}</strong>
            </p>
            {error && (
              <p className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-xl mb-3">
                {error}
              </p>
            )}
            <div className="mb-4">
              <label className="label">
                Comment <span className="text-danger">*</span>
              </label>
              <textarea
                rows={4}
                className="input w-full resize-none"
                placeholder="Your comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                minLength={3}
              />
              <p className="text-xs text-gray-400 mt-1">
                {comment.length} / 3 characters minimum
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={() => {
                  setCommentModal(null);
                  setComment("");
                  setError("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={handleComment}
                disabled={loading || comment.trim().length < 3}
              >
                {loading ? "Adding..." : "Add Comment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
