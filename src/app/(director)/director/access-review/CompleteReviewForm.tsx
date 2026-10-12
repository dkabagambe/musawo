"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props { quarter: string }

export default function CompleteReviewForm({ quarter }: Props) {
  const router = useRouter();
  const [notes, setNotes]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/director/access-review", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ quarter, notes }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed."); return; }
      setDone(true);
      router.refresh();
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  if (done) return <p className="text-success font-medium mt-4">✅ Access review recorded for {quarter}.</p>;

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      {error && <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3">{error}</div>}
      <div>
        <label htmlFor="notes" className="label">Review notes (optional)</label>
        <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="input resize-none" placeholder="Any changes made, accounts removed, anomalies noted…" />
      </div>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Saving…" : `Mark ${quarter} review complete`}
      </button>
    </form>
  );
}
