"use client";

import { useState } from "react";
import { MessageSquare, Send, X } from "lucide-react";

export default function AttendanceDispute({
  classId,
  className,
  tutorId,
  startMark,
  endMark,
}: {
  classId: string;
  className: string;
  tutorId?: string;
  startMark: string | null;
  endMark: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  // Only show dispute button for records with a mark
  if (!startMark && !endMark) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/attendance/dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, className, note }),
      });
      if (!response.ok) throw new Error("Could not send report");
      setSent(true);
      setNote("");
      setOpen(false);
    } catch {
      setError("Could not send your report. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return <span className="text-xs text-success">Reported</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-gray-400 hover:text-primary inline-flex items-center gap-1"
        aria-label={`Report dispute for ${className}`}
        title="Report disputed record to instructor"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Report
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Report attendance dispute"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-primary">Report Attendance Dispute</h3>
                <p className="text-xs text-gray-500 mt-0.5">{className}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="p-1 rounded-lg hover:bg-surface">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-gray-500 bg-surface rounded-xl px-3 py-2">
              Current marks: Start {startMark ?? "-"}, End {endMark ?? "-"}.
              Your message will be sent to your instructor.
            </div>

            <form onSubmit={submit} className="space-y-3">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Explain why you believe this attendance record is incorrect..."
                rows={4}
                required
                className="w-full rounded-xl border border-border bg-white dark:bg-gray-800 px-3 py-2 text-sm text-primary placeholder:text-gray-400 focus:outline-none focus:border-primary/40 resize-none"
              />
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-outline text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending || !note.trim()}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sending ? "Sending..." : "Send report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
