"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  paymentId: string;
  studentName: string;
  amount: number;
  courseName: string;
}

export default function PaymentProofSubmit({
  paymentId,
  studentName,
  amount,
  courseName,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transactionId.trim()) { setError("Transaction ID is required."); return; }
    setLoading(true);
    setError("");

    const reason = [
      `Payment proof for: ${studentName}`,
      `Course: ${courseName}`,
      `Amount: UGX ${amount.toLocaleString()}`,
      `Transaction ID: ${transactionId.trim()}`,
      notes.trim() ? `Notes: ${notes.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PAYMENT_PROOF",
          reason,
          paymentId,
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to submit.");
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <span className="text-xs text-green-700 font-medium">
        Proof submitted for approval
      </span>
    );
  }

  if (!open) {
    return (
      <button
        className="btn-outline text-xs px-3 py-1.5"
        onClick={() => setOpen(true)}
      >
        Submit proof
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-xs">
      {error && <p className="text-xs text-danger">{error}</p>}
      <input
        required
        className="input text-xs"
        placeholder="Transaction ID (MoMo ref) *"
        value={transactionId}
        onChange={(e) => setTransactionId(e.target.value)}
      />
      <input
        className="input text-xs"
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-ghost text-xs px-2 py-1"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary text-xs px-3 py-1">
          {loading ? "Submitting..." : "Submit"}
        </button>
      </div>
    </form>
  );
}
