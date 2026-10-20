"use client";

import { useState } from "react";

type RequestType = "REFUND" | "WAIVER" | "FEE_CHANGE";

export default function FinanceApprovalsPage() {
  const [form, setForm] = useState({
    type: "REFUND" as RequestType,
    reason: "",
    amount: "",
    enrolmentId: "",
    studentId: "",
  });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.reason.trim()) { setError("Reason is required."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/approvals", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type:        form.type,
          reason:      form.reason,
          amount:      form.amount ? Number(form.amount) : undefined,
          enrolmentId: form.enrolmentId || undefined,
          studentId:   form.studentId   || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError((d as { error?: string }).error ?? "Failed."); return; }
      setSuccess("Request submitted. The Director will be notified by email.");
      setForm({ type: "REFUND", reason: "", amount: "", enrolmentId: "", studentId: "" });
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-primary mb-6">Submit Approval Request</h1>
      <p className="text-sm text-gray-500 mb-6">
      Refunds, waivers, and fee changes all require Director approval.
        You will be notified by email when a decision is made.
      </p>

      <div className="card">
        {error && <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}
        {success && <div role="status" className="bg-success/10 border border-success/20 text-green-800 text-sm rounded-xl px-4 py-3 mb-4">{success}</div>}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="label" htmlFor="type">Request type</label>
            <select id="type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as RequestType }))} className="input">
              <option value="REFUND">Refund</option>
              <option value="WAIVER">Fee waiver</option>
              <option value="FEE_CHANGE">Fee change</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="amount">Amount (UGX) - if applicable</label>
            <input id="amount" type="number" min="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="input" placeholder="e.g. 150000" />
          </div>
          <div>
            <label className="label" htmlFor="studentId">Student ID (optional)</label>
            <input id="studentId" type="text" value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))} className="input" placeholder="cuid..." />
          </div>
          <div>
            <label className="label" htmlFor="enrolmentId">Enrolment ID (optional)</label>
            <input id="enrolmentId" type="text" value={form.enrolmentId} onChange={(e) => setForm((f) => ({ ...f, enrolmentId: e.target.value }))} className="input" placeholder="cuid..." />
          </div>
          <div>
            <label className="label" htmlFor="reason">Reason <span className="text-danger">*</span></label>
            <textarea id="reason" rows={4} required value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} className="input resize-none" placeholder="Provide full justification..." />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Submitting..." : "Submit for approval"}
          </button>
        </form>
      </div>
    </div>
  );
}
