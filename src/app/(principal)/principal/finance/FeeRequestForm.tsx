"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RequestType = "FEE_CHANGE" | "WAIVER" | "REFUND";

const TYPE_LABELS: Record<RequestType, string> = {
  FEE_CHANGE: "Fee Structure Change",
  WAIVER:     "Fee Waiver",
  REFUND:     "Payment Refund",
};

const TYPE_DESCRIPTIONS: Record<RequestType, string> = {
  FEE_CHANGE: "Propose a change to the fee structure. The Director will approve.",
  WAIVER:     "Request a partial or full fee waiver for a student. The Director will approve.",
  REFUND:     "Request a refund for an overpayment or cancellation. The Director will approve.",
};

export default function FeeRequestForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>("WAIVER");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 10) {
      setError("Please provide at least 10 characters of detail.");
      return;
    }
    setLoading(true);
    setError("");

    const body: Record<string, unknown> = {
      type:   requestType,
      reason: reason.trim(),
    };
    const amt = Number(amount);
    if (!isNaN(amt) && amt > 0) body.amount = amt;

    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to submit.");
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="card text-center py-8 max-w-md">
        <p className="text-3xl mb-3">✅</p>
        <p className="text-green-800 font-semibold text-sm">
          {TYPE_LABELS[requestType]} request submitted to Director for approval.
        </p>
        <button
          className="text-xs text-accent underline mt-3"
          onClick={() => { setSuccess(false); setReason(""); setAmount(""); setOpen(false); }}
        >
          Submit another request
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button className="btn-outline text-sm" onClick={() => setOpen(true)}>
        Submit fee request
      </button>
    );
  }

  return (
    <div className="card max-w-xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-semibold text-base">New Finance Request</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Requires Director approval.
          </p>
        </div>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4"
          onClick={() => setOpen(false)}
        >
          &times;
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p role="alert" className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-xl">
            {error}
          </p>
        )}

        <div>
          <label className="label">Request type <span className="text-danger">*</span></label>
          <select
            required
            className="input w-full"
            value={requestType}
            onChange={(e) => setRequestType(e.target.value as RequestType)}
          >
            {(Object.keys(TYPE_LABELS) as RequestType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">{TYPE_DESCRIPTIONS[requestType]}</p>
        </div>

        <div>
          <label className="label">Amount (UGX) <span className="text-gray-400 text-xs">optional</span></label>
          <input
            type="number"
            min={0}
            className="input w-full"
            placeholder="e.g. 150000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div>
          <label className="label">
            Details <span className="text-danger">*</span>
          </label>
          <textarea
            required
            minLength={10}
            rows={4}
            className="input w-full resize-none"
            placeholder="Describe the student, course, reason, and any relevant context..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <button type="button" className="btn-ghost flex-1" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || reason.trim().length < 10}
            className="btn-primary flex-1"
          >
            {loading ? "Submitting..." : "Submit to Director"}
          </button>
        </div>
      </form>
    </div>
  );
}
