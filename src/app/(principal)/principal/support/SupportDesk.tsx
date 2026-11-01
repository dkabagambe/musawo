"use client";

import { useEffect, useState } from "react";

type Ticket = {
  id: string;
  subject: string;
  body: string;
  category: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  replies: Array<{
    id: string;
    body: string;
    author: { name: string };
    createdAt: string;
    isStaff: boolean;
  }>;
  createdAt: string;
};

const STATUS_BADGE: Record<string, string> = {
  OPEN:        "badge-warning",
  IN_PROGRESS: "badge-info",
  RESOLVED:    "badge-success",
  CLOSED:      "badge-danger",
};

export default function SupportDesk() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/support", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load tickets.");
      const data = await res.json() as { tickets: Ticket[] };
      setTickets(data.tickets);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error loading tickets.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, category }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to submit ticket.");
        return;
      }
      setSubmitDone(true);
      setSubject("");
      setBody("");
      setCategory("GENERAL");
      await load();
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-xl">
          {error}
        </p>
      )}

      {/* Submit form */}
      <div className="card">
        <h2 className="font-semibold text-base mb-4">Submit a Support Request</h2>
        {submitDone && (
          <p className="text-green-700 text-sm mb-3">
            Ticket submitted. IT Admin will respond shortly.
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Category</label>
            <select
              className="input w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {["GENERAL", "ACADEMIC", "TECHNICAL", "ENROLMENT", "OTHER"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Subject <span className="text-danger">*</span></label>
            <input
              required
              className="input w-full"
              placeholder="Brief description of the issue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              minLength={3}
            />
          </div>
          <div>
            <label className="label">Details <span className="text-danger">*</span></label>
            <textarea
              required
              rows={4}
              className="input w-full resize-none"
              placeholder="Describe the issue in detail..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              minLength={10}
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Submitting..." : "Submit ticket"}
          </button>
        </form>
      </div>

      {/* My tickets */}
      <div className="card">
        <h2 className="font-semibold text-base mb-4">My Tickets</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-gray-400">No support tickets yet.</p>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
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
                      <span className="text-xs text-gray-400">{t.category}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(t.createdAt).toLocaleDateString("en-UG")}
                      {t.replies.length > 0 && ` - ${t.replies.length} repl${t.replies.length === 1 ? "y" : "ies"}`}
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
                              {r.isStaff && " (IT Admin)"}
                            </p>
                            <p className="text-gray-700 whitespace-pre-wrap">{r.body}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
