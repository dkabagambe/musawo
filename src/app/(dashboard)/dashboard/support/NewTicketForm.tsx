"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTicketForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim() }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setSubject("");
      setBody("");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        + Open a support ticket
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2 className="text-lg font-semibold mb-4">New support ticket</h2>
      {error && <p className="text-danger text-sm mb-3 bg-danger/10 rounded-xl p-3">{error}</p>}
      <div className="mb-4">
        <label htmlFor="ticket-subject" className="label">Subject *</label>
        <input
          id="ticket-subject"
          type="text"
          className="input"
          placeholder="Briefly describe your issue"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          maxLength={200}
        />
      </div>
      <div className="mb-4">
        <label htmlFor="ticket-body" className="label">Details *</label>
        <textarea
          id="ticket-body"
          className="input min-h-[120px] resize-y"
          placeholder="Describe the issue in detail - include your course, what you were doing, and any error messages."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          maxLength={3000}
        />
      </div>
      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Submitting…" : "Submit ticket"}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
