"use client";

import { useState } from "react";
import { Pin, Lock, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ForumActions({
  threadId,
  pinned,
  locked,
  isAuthor,
}: {
  threadId: string;
  pinned: boolean;
  locked: boolean;
  isAuthor: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/forum?threadId=${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Action failed.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteThread() {
    if (!confirm("Delete this thread and all replies? This cannot be undone.")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/forum?threadId=${threadId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/tutor/forum");
      } else {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Delete failed.");
        setBusy(false);
      }
    } catch {
      setError("Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {error && <p className="text-xs text-danger w-full">{error}</p>}
      <button
        onClick={() => patch({ pinned: !pinned })}
        disabled={busy}
        className={`btn-outline text-xs flex items-center gap-1 ${pinned ? "border-primary text-primary" : ""}`}
        title={pinned ? "Unpin thread" : "Pin thread"}
      >
        <Pin className="w-3.5 h-3.5" />
        {pinned ? "Unpin" : "Pin"}
      </button>
      <button
        onClick={() => patch({ locked: !locked })}
        disabled={busy}
        className={`btn-outline text-xs flex items-center gap-1 ${locked ? "border-warning text-amber-700" : ""}`}
        title={locked ? "Unlock thread" : "Lock thread"}
      >
        <Lock className="w-3.5 h-3.5" />
        {locked ? "Unlock" : "Lock"}
      </button>
      {isAuthor && (
        <button
          onClick={deleteThread}
          disabled={busy}
          className="btn-outline text-xs flex items-center gap-1 text-danger border-danger/40 hover:bg-danger/5"
          title="Delete thread"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      )}
    </div>
  );
}
