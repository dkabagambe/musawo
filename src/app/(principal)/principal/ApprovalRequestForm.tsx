"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  type: string;
  label: string;
  description: string;
  buttonLabel?: string;
  placeholder?: string;
}

export default function ApprovalRequestForm({ type, label, description, buttonLabel, placeholder }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
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

    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, reason: reason.trim() }),
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
          Request submitted to Director for approval.
        </p>
        <button
          className="text-xs text-accent underline mt-3"
          onClick={() => { setSuccess(false); setReason(""); setOpen(false); }}
        >
          Submit another request
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button className="btn-outline text-sm" onClick={() => setOpen(true)}>
        {buttonLabel ?? `Request ${label} change`}
      </button>
    );
  }

  return (
    <div className="card max-w-xl">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="font-semibold text-base">{label}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
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
          <label className="label">
            Description of change <span className="text-danger">*</span>
          </label>
          <textarea
            required
            minLength={10}
            rows={4}
            className="input w-full resize-none"
            placeholder={placeholder ?? "Describe the change and the reason for it..."}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">{reason.length} / 2000 characters</p>
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
