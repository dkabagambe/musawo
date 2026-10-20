"use client";

import { useState } from "react";

export default function InviteActions({ inviteId }: { inviteId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function act(action: "resend" | "revoke") {
    if (action === "revoke" && !window.confirm("Revoke this invite? Its current link will stop working.")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/staff-invite/${inviteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not update invite.");
      setMessage(action === "resend" ? "Invite resent" : "Invite revoked");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update invite.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled={busy} onClick={() => void act("resend")} className="text-xs text-primary hover:underline disabled:opacity-50">Resend</button>
      <button type="button" disabled={busy} onClick={() => void act("revoke")} className="text-xs text-danger hover:underline disabled:opacity-50">Revoke</button>
      <span aria-live="polite" className="sr-only">{message}</span>
    </div>
  );
}
