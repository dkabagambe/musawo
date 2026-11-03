"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  applicationId: string;
  applicantName: string;
  courseName?: string | null;
  currentStatus: string;
  requireApproval?: boolean;
}

export default function AdminAdmissionActions({
  applicationId,
  applicantName,
  courseName,
  currentStatus,
  requireApproval = true,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "review" | "accept" | "reject">(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function submit(action: string, extra?: Record<string, unknown>) {
    setLoading(true);
    setError("");
    try {
      if (action === "ACCEPT" && requireApproval) {
        const res = await fetch("/api/approvals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "ADMISSION",
            reason: `Admission request for ${applicantName}${courseName ? ` to ${courseName}` : ""}. Submitted by Admin for Principal approval.`,
            applicationId,
          }),
        });
        if (!res.ok) {
          const d = await res.json() as { error?: string };
          setError(d.error ?? "Failed to submit for approval.");
          return;
        }
        setDone("Submitted for Principal approval.");
        setMode(null);
        router.refresh();
        return;
      }
      const res = await fetch(`/api/registrar/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed.");
        return;
      }
      setDone(
        action === "ACCEPT"
          ? "Admitted. Account created and invite sent."
          : action === "REJECT"
          ? "Application rejected."
          : "Marked as under review."
      );
      setMode(null);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="text-xs text-green-700 font-medium flex-shrink-0 max-w-48 text-right">
        {done}
      </p>
    );
  }

  if (mode === null) {
    return (
      <div className="flex flex-col gap-2 flex-shrink-0">
        {currentStatus === "SUBMITTED" && (
          <button
            className="btn-outline text-xs px-3 py-1.5"
            onClick={() => void submit("UNDER_REVIEW")}
            disabled={loading}
          >
            Mark reviewing
          </button>
        )}
        <button
          className="btn-primary text-xs px-3 py-1.5"
          onClick={() => setMode("accept")}
        >
          {requireApproval ? "Submit to Principal" : "Admit & register"}
        </button>
        <button
          className="btn-ghost text-xs px-3 py-1.5 text-danger"
          onClick={() => setMode("reject")}
        >
          Reject
        </button>
      </div>
    );
  }

  if (mode === "accept") {
    return (
      <div className="flex-shrink-0 max-w-56 text-right">
        <p className="text-xs text-gray-600 mb-2">
          {requireApproval
            ? <>Submit <strong>{applicantName}</strong>{courseName ? ` (${courseName})` : ""} for Principal approval? The account will be created after approval.</>
            : <>Admit <strong>{applicantName}</strong>{courseName ? ` to ${courseName}` : ""}? An account will be created and they will receive a set-password link.</>
          }
        </p>
        {error && <p className="text-xs text-danger mb-2">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button className="btn-ghost text-xs px-3 py-1.5" onClick={() => setMode(null)}>
            Cancel
          </button>
          <button
            className="btn-primary text-xs px-3 py-1.5"
            onClick={() => void submit("ACCEPT")}
            disabled={loading}
          >
            {loading ? "Processing..." : requireApproval ? "Send to Principal" : "Confirm"}
          </button>
        </div>
      </div>
    );
  }

  // reject mode
  return (
    <div className="flex-shrink-0 max-w-64">
      <p className="text-xs text-gray-600 mb-2">
        Reason for rejection (required):
      </p>
      <textarea
        rows={2}
        className="input text-xs w-full resize-none mb-2"
        value={rejectReason}
        onChange={(e) => setRejectReason(e.target.value)}
        placeholder="Explain why this application is rejected..."
      />
      {error && <p className="text-xs text-danger mb-1">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button className="btn-ghost text-xs px-3 py-1.5" onClick={() => setMode(null)}>
          Cancel
        </button>
        <button
          className="bg-danger text-white text-xs px-3 py-1.5 rounded-xl"
          onClick={() => void submit("REJECT", { rejectionReason: rejectReason })}
          disabled={loading || rejectReason.trim().length < 5}
        >
          {loading ? "Rejecting..." : "Reject"}
        </button>
      </div>
    </div>
  );
}
