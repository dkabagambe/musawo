"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Student {
  id: string;
  name: string;
  email: string;
  enrolments: {
    id: string;
    courseId: string;
    courseTitle: string;
    courseFee: number;
  }[];
}

interface Props {
  students: Student[];
}

export default function PaymentProofForm({ students }: Props) {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [enrolmentId, setEnrolmentId] = useState("");
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [transactionId, setTransactionId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentTime, setPaymentTime] = useState("");
  const [method, setMethod] = useState<"MTN" | "AIRTEL">("MTN");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const selectedStudent = students.find((s) => s.id === studentId);
  const selectedEnrolment = selectedStudent?.enrolments.find((e) => e.id === enrolmentId);

  // Calculate expected amount based on phase (50%, 25%, 25%)
  const expectedAmount = selectedEnrolment
    ? phase === 1
      ? selectedEnrolment.courseFee * 0.5
      : selectedEnrolment.courseFee * 0.25
    : 0;

  const amountNum = Number(amount);
  const amountMismatch =
    amountNum > 0 && expectedAmount > 0 && Math.abs(amountNum - expectedAmount) > 1000;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!studentId || !enrolmentId || !transactionId.trim() || !amount || !paymentDate) {
      setError("Please fill all required fields.");
      return;
    }

    if (!screenshot) {
      setError("Screenshot is required.");
      return;
    }

    if (screenshot.size > 5 * 1024 * 1024) {
      setError("Screenshot must be under 5 MB.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Upload screenshot first
      const formData = new FormData();
      formData.append("file", screenshot);
      formData.append("type", "payment-proof");

      const uploadRes = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const d = await uploadRes.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? "Failed to upload screenshot.");
        return;
      }

      const { url: screenshotUrl } = (await uploadRes.json()) as { url: string };

      // Submit proof for approval
      const reason = [
        `Payment Proof Submission`,
        `Student: ${selectedStudent?.name} (${selectedStudent?.email})`,
        `Course: ${selectedEnrolment?.courseTitle}`,
        `Phase: ${phase} (${phase === 1 ? "50%" : "25%"})`,
        `Transaction ID: ${transactionId.trim()}`,
        `Amount: UGX ${amountNum.toLocaleString()}`,
        `Expected: UGX ${expectedAmount.toLocaleString()}`,
        `Date/Time: ${paymentDate} ${paymentTime || ""}`.trim(),
        `Method: ${method} Mobile Money`,
        `Screenshot: ${screenshotUrl}`,
        notes.trim() ? `Notes: ${notes.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PAYMENT_PROOF",
          reason,
          metadata: {
            studentId,
            enrolmentId,
            phase,
            transactionId: transactionId.trim(),
            amount: amountNum,
            method,
            screenshotUrl,
          },
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? "Failed to submit proof.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.refresh(), 1500);
    } catch (err) {
      setError("Something went wrong.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setStudentId("");
    setEnrolmentId("");
    setPhase(1);
    setTransactionId("");
    setAmount("");
    setPaymentDate("");
    setPaymentTime("");
    setMethod("MTN");
    setScreenshot(null);
    setNotes("");
    setSuccess(false);
    setError("");
  }

  if (success) {
    return (
      <div className="text-center py-10">
        <p className="text-3xl mb-3">✅</p>
        <p className="text-green-800 font-semibold mb-2">
          Payment proof submitted for Principal approval
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Track progress in the Submission History tab
        </p>
        <button className="btn-primary text-sm" onClick={resetForm}>
          Submit Another Proof
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-xl"
        >
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">
            Student <span className="text-danger">*</span>
          </label>
          <select
            required
            className="input w-full"
            value={studentId}
            onChange={(e) => {
              setStudentId(e.target.value);
              setEnrolmentId(""); // Reset enrolment
            }}
          >
            <option value="">-- Select student --</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">
            Course <span className="text-danger">*</span>
          </label>
          <select
            required
            disabled={!selectedStudent || selectedStudent.enrolments.length === 0}
            className="input w-full disabled:opacity-50"
            value={enrolmentId}
            onChange={(e) => setEnrolmentId(e.target.value)}
          >
            <option value="">-- Select course --</option>
            {selectedStudent?.enrolments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.courseTitle}
              </option>
            ))}
          </select>
          {selectedStudent && selectedStudent.enrolments.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">Student has no active enrolments</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="label">
            Payment Phase <span className="text-danger">*</span>
          </label>
          <select
            required
            className="input w-full"
            value={phase}
            onChange={(e) => setPhase(Number(e.target.value) as 1 | 2 | 3)}
          >
            <option value="1">Phase 1 (50%)</option>
            <option value="2">Phase 2 (25%)</option>
            <option value="3">Phase 3 (25%)</option>
          </select>
        </div>

        <div>
          <label className="label">
            Amount (UGX) <span className="text-danger">*</span>
          </label>
          <input
            required
            type="number"
            min="0"
            step="1"
            className="input w-full"
            placeholder="e.g. 500000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {expectedAmount > 0 && (
            <p className={`text-xs mt-1 ${amountMismatch ? "text-warning" : "text-gray-400"}`}>
              Expected: UGX {expectedAmount.toLocaleString()}
              {amountMismatch && " (mismatch)"}
            </p>
          )}
        </div>

        <div>
          <label className="label">
            Method <span className="text-danger">*</span>
          </label>
          <select
            required
            className="input w-full"
            value={method}
            onChange={(e) => setMethod(e.target.value as "MTN" | "AIRTEL")}
          >
            <option value="MTN">MTN Mobile Money</option>
            <option value="AIRTEL">Airtel Mobile Money</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">
            Transaction ID <span className="text-danger">*</span>
          </label>
          <input
            required
            type="text"
            className="input w-full font-mono text-sm"
            placeholder="Mobile Money reference number"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">
            Must be unique (system checks for duplicates)
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">
              Date <span className="text-danger">*</span>
            </label>
            <input
              required
              type="date"
              className="input w-full"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Time</label>
            <input
              type="time"
              className="input w-full"
              value={paymentTime}
              onChange={(e) => setPaymentTime(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="label">
          Screenshot <span className="text-danger">*</span>
        </label>
        <input
          required
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          className="input w-full"
          onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
        />
        <p className="text-xs text-gray-400 mt-1">
          PNG or JPEG, max 5 MB. System checks for duplicate images.
        </p>
      </div>

      <div>
        <label className="label">Notes (optional)</label>
        <textarea
          rows={3}
          className="input w-full resize-none"
          placeholder="Additional information for the Principal..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Submitting..." : "Send to Principal"}
        </button>
        <button
          type="button"
          onClick={resetForm}
          className="btn-ghost"
          disabled={loading}
        >
          Clear form
        </button>
      </div>
    </form>
  );
}
