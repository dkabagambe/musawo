"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import type { TimetableClass } from "./TimetableView";

interface Props {
  cls: TimetableClass;
  onClose: () => void;
  onCancelled: (id: string, reason: string) => void;
}

export default function CancelModal({ cls, onClose, onCancelled }: Props) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!reason.trim()) { setError("Please give a reason for cancellation."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tutor/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          classId: cls.id,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to cancel class.");
        return;
      }
      onCancelled(cls.id, reason.trim());
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Cancel class"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-danger" />
            <h2 className="font-bold text-primary">Cancel class</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-surface">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="bg-danger/5 border border-danger/20 rounded-xl px-4 py-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              You are about to cancel: <strong>{cls.title}</strong>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(cls.scheduledAt).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })} EAT
            </p>
          </div>

          {error && (
            <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="label" htmlFor="can-reason">Reason for cancellation</label>
            <textarea
              id="can-reason"
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input resize-none"
              placeholder="e.g. Skills Lab unavailable. Session will be rescheduled."
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1">Enrolled students will be notified. {500 - reason.length} characters left.</p>
          </div>

          <p className="text-xs text-gray-400 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl px-3 py-2">
            This action cannot be undone. Enrolled students will receive an in-app notification.
          </p>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-outline flex-1">Keep class</button>
            <button type="submit" disabled={submitting} className="bg-danger text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 flex-1">
              {submitting ? "Cancelling..." : "Cancel class"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
