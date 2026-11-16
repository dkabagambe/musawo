"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle, Loader2 } from "lucide-react";

export default function CloseTicketButton({
  ticketId,
  backHref,
}: {
  ticketId: string;
  backHref: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClose() {
    if (!confirm("Close this ticket? You can still open a new one if the issue comes back.")) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/support/${ticketId}/close`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Could not close the ticket.");
        return;
      }
      router.push(backHref);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <p className="text-danger text-sm mb-2">{error}</p>}
      <button
        type="button"
        onClick={handleClose}
        disabled={loading}
        className="btn-ghost text-sm text-gray-500 flex items-center gap-1.5"
      >
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <XCircle className="w-4 h-4" />}
        Close ticket
      </button>
    </div>
  );
}
