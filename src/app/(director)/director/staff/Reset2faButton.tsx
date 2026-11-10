"use client";

import { useState } from "react";

/** Button for the Director to reset a staff member's 2FA. */
export default function Reset2faButton({ userId, userName }: { userId: string; userName: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    if (!confirm(`Reset 2FA for ${userName}? They will need to set it up again on next login.`)) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/director/reset-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json() as { ok?: boolean; message?: string; error?: string };
      if (res.ok) {
        setResult(data.message ?? "2FA reset successfully.");
      } else {
        setError(data.error ?? "Failed to reset 2FA.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={handleReset}
        disabled={loading}
        className="text-xs text-danger no-underline hover:underline disabled:opacity-50"
      >
        {loading ? "Resetting..." : "Reset 2FA"}
      </button>
      {result && <span className="text-xs text-success">{result}</span>}
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
