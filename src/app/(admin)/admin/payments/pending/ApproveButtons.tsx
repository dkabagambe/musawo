"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApprovePaymentButtons({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  async function act(action: "approve" | "reject") {
    setLoading(action);
    setError("");
    try {
      const res = await fetch("/api/admin/payments/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, action, reason: rejectReason }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Action failed"); return; }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      {error && <p className="text-danger text-xs">{error}</p>}

      <button
        className="btn-primary text-sm px-5"
        onClick={() => act("approve")}
        disabled={loading !== null}
      >
        {loading === "approve" ? "Approving…" : "✓ Approve"}
      </button>

      {!showReject ? (
        <button
          className="btn-ghost text-sm text-danger"
          onClick={() => setShowReject(true)}
          disabled={loading !== null}
        >
          ✕ Reject
        </button>
      ) : (
        <div className="flex flex-col gap-2 items-end w-full">
          <input
            type="text"
            className="input text-sm w-full"
            placeholder="Reason for rejection (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              className="btn-ghost text-sm"
              onClick={() => setShowReject(false)}
            >
              Cancel
            </button>
            <button
              className="btn text-sm px-4 bg-danger text-white hover:bg-red-700"
              onClick={() => act("reject")}
              disabled={loading !== null}
            >
              {loading === "reject" ? "Rejecting…" : "Confirm reject"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
