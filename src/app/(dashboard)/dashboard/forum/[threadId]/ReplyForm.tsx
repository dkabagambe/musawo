"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForumReplyForm({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/forum/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, body: body.trim() }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setBody("");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="reply-body" className="label">Your reply</label>
      <textarea
        id="reply-body"
        className="input min-h-[100px] resize-y"
        placeholder="Write your reply…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
      />
      {error && <p className="text-danger text-sm mt-2">{error}</p>}
      <button type="submit" className="btn-primary mt-3" disabled={loading || !body.trim()}>
        {loading ? "Posting…" : "Post reply"}
      </button>
    </form>
  );
}
