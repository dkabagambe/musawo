"use client";

import { useState } from "react";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

type RequestType = "REFUND" | "WAIVER" | "FEE_CHANGE";
type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

interface Request {
  id: string;
  type: RequestType;
  status: RequestStatus;
  reason: string;
  amount: number | null;
  studentId: string | null;
  enrolmentId: string | null;
  decisionNote: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
}

interface Enrolment {
  id: string;
  studentName: string;
  studentNumber: string;
  studentId: string;
  courseTitle: string;
  status: string;
}

interface Props {
  myRequests: Request[];
  enrolments: Enrolment[];
}

const TYPE_LABEL: Record<RequestType, string> = {
  REFUND: "Refund",
  WAIVER: "Fee waiver",
  FEE_CHANGE: "Fee change",
};

const STATUS_CONFIG: Record<RequestStatus, { icon: React.ReactNode; cls: string; label: string }> = {
  PENDING:   { icon: <Clock className="w-3.5 h-3.5" />,        cls: "bg-amber-50 text-amber-700",  label: "Pending" },
  APPROVED:  { icon: <CheckCircle className="w-3.5 h-3.5" />,  cls: "bg-success/10 text-success",  label: "Approved" },
  REJECTED:  { icon: <XCircle className="w-3.5 h-3.5" />,      cls: "bg-danger/10 text-danger",    label: "Rejected" },
  CANCELLED: { icon: <AlertCircle className="w-3.5 h-3.5" />,  cls: "bg-gray-100 text-gray-500",   label: "Cancelled" },
};

export default function FinanceApprovalsClient({ myRequests, enrolments }: Props) {
  const [form, setForm] = useState({
    type: "REFUND" as RequestType,
    reason: "",
    amount: "",
    enrolmentId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [requests, setRequests] = useState<Request[]>(myRequests);
  const [showForm, setShowForm] = useState(false);

  const selectedEnrolment = enrolments.find((e) => e.id === form.enrolmentId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.reason.trim()) { setError("Reason is required."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          reason: form.reason,
          amount: form.amount ? Number(form.amount) : undefined,
          enrolmentId: form.enrolmentId || undefined,
          studentId: selectedEnrolment?.studentId || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError((d as { error?: string }).error ?? "Failed to submit.");
        return;
      }
      const newReq = await res.json();
      setSuccess("Request submitted. The Director will review and you will be notified by email.");
      setRequests((prev) => [newReq, ...prev]);
      setForm({ type: "REFUND", reason: "", amount: "", enrolmentId: "" });
      setShowForm(false);
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Approval Requests</h1>
          <p className="text-sm text-gray-500 mt-1">
            Refunds, fee waivers and fee changes require Director approval.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary text-sm"
        >
          {showForm ? "Cancel" : "+ New request"}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="font-semibold mb-4">Submit a new request</h2>
          {error && (
            <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}
          {success && (
            <div role="status" className="bg-success/10 border border-success/20 text-green-800 text-sm rounded-xl px-4 py-3 mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="label" htmlFor="type">Request type</label>
              <select
                id="type"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as RequestType }))}
                className="input"
              >
                <option value="REFUND">Refund</option>
                <option value="WAIVER">Fee waiver</option>
                <option value="FEE_CHANGE">Fee change</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="enrolmentId">Student enrolment</label>
              <select
                id="enrolmentId"
                value={form.enrolmentId}
                onChange={(e) => setForm((f) => ({ ...f, enrolmentId: e.target.value }))}
                className="input"
              >
                <option value="">Select a student enrolment...</option>
                {enrolments.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.studentName} ({e.studentNumber}) - {e.courseTitle}
                  </option>
                ))}
              </select>
            </div>

            {(form.type === "REFUND" || form.type === "WAIVER") && (
              <div>
                <label className="label" htmlFor="amount">Amount (UGX)</label>
                <input
                  id="amount"
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="input"
                  placeholder="e.g. 150000"
                />
              </div>
            )}

            <div>
              <label className="label" htmlFor="reason">
                Reason <span className="text-danger">*</span>
              </label>
              <textarea
                id="reason"
                rows={4}
                required
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                className="input resize-none"
                placeholder="Provide full justification..."
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Submitting..." : "Submit for Director approval"}
            </button>
          </form>
        </div>
      )}

      {/* Existing requests list */}
      <div>
        <h2 className="text-lg font-semibold text-primary mb-3">My requests ({requests.length})</h2>
        {requests.length === 0 ? (
          <div className="card text-center py-10 text-gray-400 text-sm">
            No requests submitted yet. Use the button above to submit one.
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.PENDING;
              return (
                <div key={req.id} className="card">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <span className="text-sm font-semibold text-primary">
                        {TYPE_LABEL[req.type]}
                      </span>
                      {req.amount != null && (
                        <span className="ml-2 text-sm text-gray-500">
                          UGX {req.amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.cls}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{req.reason}</p>
                  <p className="text-xs text-gray-400">
                    Submitted {new Date(req.createdAt).toLocaleDateString("en-UG")}
                  </p>
                  {req.decidedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      Decision by {req.decidedBy ?? "Director"} on {new Date(req.decidedAt).toLocaleDateString("en-UG")}
                      {req.decisionNote && `: ${req.decisionNote}`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
