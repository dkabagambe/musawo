"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  studentId: string;
}

export default function StudentInviteActions({ studentId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleAction(action: "resend" | "revoke") {
    if (action === "revoke" && !confirm("Revoke this invitation? The student will not be able to set their password.")) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/admin/invites/student/${studentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = (await res.json()) as { error?: string; message?: string };

      if (!res.ok) {
        setError(data.error ?? "Action failed");
        return;
      }

      setSuccess(data.message ?? "Action completed");
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return <p className="text-xs text-success">{success}</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {error && <p className="text-xs text-danger mb-1">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => void handleAction("resend")}
          disabled={loading}
          className="btn-outline text-xs px-3 py-1"
        >
          {loading ? "..." : "Resend"}
        </button>
        <button
          onClick={() => void handleAction("revoke")}
          disabled={loading}
          className="btn-ghost text-xs px-3 py-1 text-danger"
        >
          Revoke
        </button>
      </div>
    </div>
  );
}
