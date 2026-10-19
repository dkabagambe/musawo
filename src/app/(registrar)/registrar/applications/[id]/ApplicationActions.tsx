"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  applicationId: string;
  applicantName: string;
  applicantEmail: string;
  courseId: string;
  courseTitle: string;
  intakeId?: string;
  currentStatus: string;
}

type Action = "ACCEPT" | "REJECT" | "UNDER_REVIEW";

export default function ApplicationActions({
  applicationId,
  applicantName,
  applicantEmail,
  courseTitle,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [action, setAction]         = useState<Action | null>(null);
  const [rejectionReason, setReason] = useState("");
  const [loading, setLoading]        = useState(false);
  const [error, setError]            = useState("");

  async function submit() {
    if (!action) return;
    if (action === "REJECT" && !rejectionReason.trim()) {
      setError("Please provide a rejection reason.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/registrar/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejectionReason: action === "REJECT" ? rejectionReason.trim() : undefined,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card space-y-4">
      <h2 className="font-semibold">Actions</h2>

      {error && (
        <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {currentStatus === "SUBMITTED" && (
          <button
            onClick={() => { setAction("UNDER_REVIEW"); setError(""); }}
            className={`btn-outline text-sm ${action === "UNDER_REVIEW" ? "border-primary text-primary" : ""}`}
          >
            Mark as under review
          </button>
        )}
        <button
          onClick={() => { setAction("ACCEPT"); setError(""); }}
          className={`btn-primary text-sm ${action === "ACCEPT" ? "ring-2 ring-primary ring-offset-1" : ""}`}
        >
          Accept &amp; create account
        </button>
        <button
          onClick={() => { setAction("REJECT"); setError(""); }}
          className={`btn-outline text-sm border-danger text-danger hover:bg-danger/5 ${action === "REJECT" ? "ring-2 ring-danger ring-offset-1" : ""}`}
        >
          Reject
        </button>
      </div>

      {/* Accept confirmation */}
      {action === "ACCEPT" && (
        <div className="bg-success/5 border border-success/20 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-success">Accept and create student account</p>
          <p className="text-sm text-gray-600">
            This will create a student account for <strong>{applicantName}</strong> ({applicantEmail})
            and send them a secure invite link to set their password and confirm enrolment for{" "}
            <strong>{courseTitle}</strong>.
          </p>
          <div className="flex gap-3">
            <button
              onClick={submit}
              disabled={loading}
              className="btn-primary text-sm"
            >
              {loading ? "Creating account…" : "Confirm - create account & send invite"}
            </button>
            <button onClick={() => setAction(null)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Under review confirmation */}
      {action === "UNDER_REVIEW" && (
        <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium">Mark as under review</p>
          <p className="text-sm text-gray-600">
            This will mark {applicantName}&apos;s application as under review. No email is sent - this
            is for your own tracking.
          </p>
          <div className="flex gap-3">
            <button
              onClick={submit}
              disabled={loading}
              className="btn-primary text-sm"
            >
              {loading ? "Updating…" : "Confirm"}
            </button>
            <button onClick={() => setAction(null)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Reject form */}
      {action === "REJECT" && (
        <div className="bg-danger/5 border border-danger/20 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-danger">Reject application</p>
          <div>
            <label htmlFor="rejection-reason" className="label text-xs">
              Rejection reason <span className="text-danger">*</span>
            </label>
            <textarea
              id="rejection-reason"
              rows={3}
              value={rejectionReason}
              onChange={(e) => setReason(e.target.value)}
              className="input resize-none"
              placeholder="Explain why the application is being rejected (this will be stored internally)…"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={submit}
              disabled={loading || !rejectionReason.trim()}
              className="bg-danger hover:bg-red-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? "Rejecting…" : "Confirm rejection"}
            </button>
            <button onClick={() => setAction(null)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
