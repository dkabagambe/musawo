"use client";

import { useState } from "react";
import { X, RefreshCw } from "lucide-react";
import type { TimetableClass } from "./TimetableView";

interface Props {
  cls: TimetableClass;
  onClose: () => void;
  onRescheduled: (updated: TimetableClass) => void;
}

export default function RescheduleModal({ cls, onClose, onRescheduled }: Props) {
  const [newDate, setNewDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!newDate) { setError("Please choose a new date and time."); return; }
    if (!reason.trim()) { setError("Please give a reason for rescheduling."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tutor/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          classId: cls.id,
          newScheduledAt: new Date(newDate).toISOString(),
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to reschedule.");
        return;
      }
      const updated: TimetableClass = {
        ...cls,
        scheduledAt: data.class.scheduledAt,
        status: data.class.status,
        rescheduleReason: data.class.rescheduleReason,
        originalScheduledAt: data.class.originalScheduledAt ?? cls.scheduledAt,
      };
      onRescheduled(updated);
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Reschedule class"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-primary">Reschedule class</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-surface">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Rescheduling: <strong>{cls.title}</strong><br />
            <span className="text-gray-400">
              {new Date(cls.scheduledAt).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })} EAT
            </span>
          </p>

          {error && (
            <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="label" htmlFor="rs-newdate">New date and time (EAT)</label>
            <input
              id="rs-newdate"
              type="datetime-local"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label" htmlFor="rs-reason">Reason for rescheduling</label>
            <textarea
              id="rs-reason"
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input resize-none"
              placeholder="e.g. Instructor travel - rescheduled to avoid conflict."
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1">This reason is shown to enrolled students. {500 - reason.length} characters left.</p>
          </div>

          <p className="text-xs text-gray-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl px-3 py-2">
            Enrolled students will receive an in-app notification with the new time and your reason.
          </p>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? "Rescheduling..." : "Confirm reschedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
