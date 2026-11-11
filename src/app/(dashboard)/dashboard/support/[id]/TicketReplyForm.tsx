"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [body, setBody]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/support/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to send reply."); return; }
      setBody("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="text-base font-semibold">Add a reply</h2>
      {error && (
        <p className="text-sm text-danger bg-danger/10 rounded-xl px-4 py-3">{error}</p>
      )}
      <div>
        <label htmlFor="reply-body" className="label">Your message *</label>
        <textarea
          id="reply-body"
          className="input min-h-[100px] resize-y"
          placeholder="Describe the issue further or provide an update..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          maxLength={3000}
        />
      </div>
      <button type="submit" className="btn-primary" disabled={loading || !body.trim()}>
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : "Send reply"}
      </button>
    </form>
  );
}
