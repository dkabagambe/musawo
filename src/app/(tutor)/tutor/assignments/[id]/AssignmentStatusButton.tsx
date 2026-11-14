"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AssignmentStatusButton({
  assignmentId,
  currentStatus,
}: {
  assignmentId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (currentStatus !== "PUBLISHED" && currentStatus !== "DRAFT") return null;

  const action = currentStatus === "PUBLISHED" ? "close" : "reopen";
  const label = currentStatus === "PUBLISHED" ? "Close submissions" : "Reopen";

  async function handleClick() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/tutor/assignments/${assignmentId}/submissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Action failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <p className="text-xs text-danger mb-1">{error}</p>}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="btn-outline text-xs flex items-center gap-1"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        {label}
      </button>
    </div>
  );
}
