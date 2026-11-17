"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Enrolment = {
  id: string;
  user: {
    id: string;
    name: string;
    studentNumber: string | null;
    email: string | null;
  };
  course: {
    title: string;
  };
  status: string;
  totalAmountUgx: number;
  paidAmountUgx: number;
  paidPercent: number;
  createdAt: string;
};

type Props = {
  enrolments: Enrolment[];
};

export default function StudentFeeStatus({ enrolments }: Props) {
  const router = useRouter();
  const [holdModal, setHoldModal] = useState<{ enrolmentId: string; studentName: string } | null>(null);
  const [liftModal, setLiftModal] = useState<{ enrolmentId: string; studentName: string } | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePlaceHold() {
    if (!holdModal || reason.trim().length < 10) {
      setError("Reason must be at least 10 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/principal/finance/holds/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrolmentId: holdModal.enrolmentId, reason: reason.trim() }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to place hold");
        return;
      }
      setHoldModal(null);
      setReason("");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleLiftHold() {
    if (!liftModal || reason.trim().length < 10) {
      setError("Reason must be at least 10 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/principal/finance/holds/lift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrolmentId: liftModal.enrolmentId, reason: reason.trim() }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to lift hold");
        return;
      }
      setLiftModal(null);
      setReason("");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: "badge-success",
    SUSPENDED: "badge-danger",
    PENDING_PAYMENT: "badge-warning",
    PARTIALLY_PAID: "badge-info",
    COMPLETED: "badge-success",
    OVERDUE: "badge-danger",
    CANCELLED: "badge-danger",
  };

  return (
    <>
      <div className="card overflow-x-auto">
        {enrolments.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No enrolments found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Student</th>
                <th className="pb-2 font-medium pr-4">Course</th>
                <th className="pb-2 font-medium pr-4 text-right">Total Fee</th>
                <th className="pb-2 font-medium pr-4 text-right">Paid</th>
                <th className="pb-2 font-medium pr-4 text-center">Progress</th>
                <th className="pb-2 font-medium pr-4">Status</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {enrolments.map((e) => {
                const outstanding = e.totalAmountUgx - e.paidAmountUgx;
                const isSuspended = e.status === "SUSPENDED";
                return (
                  <tr key={e.id}>
                    <td className="py-2.5 pr-4">
                      <p className="font-medium">{e.user.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{e.user.studentNumber ?? "-"}</p>
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500">{e.course.title}</td>
                    <td className="py-2.5 pr-4 font-medium text-right">
                      UGX {e.totalAmountUgx.toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <p className="font-medium">UGX {e.paidAmountUgx.toLocaleString()}</p>
                      {outstanding > 0 && (
                        <p className="text-xs text-gray-400">
                          Outstanding: {outstanding.toLocaleString()}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-center">
                      <p className="font-bold text-primary">{e.paidPercent}%</p>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`badge text-xs ${STATUS_COLORS[e.status] ?? "badge-info"}`}>
                        {e.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-2.5">
                      {isSuspended ? (
                        <button
                          type="button"
                          className="text-xs text-green-600 hover:underline"
                          onClick={() => {
                            setLiftModal({ enrolmentId: e.id, studentName: e.user.name });
                            setReason("");
                            setError("");
                          }}
                        >
                          Lift Hold
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="text-xs text-amber-600 hover:underline"
                          onClick={() => {
                            setHoldModal({ enrolmentId: e.id, studentName: e.user.name });
                            setReason("");
                            setError("");
                          }}
                        >
                          Place Hold
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Place Hold Modal */}
      {holdModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full">
            <h2 className="font-semibold text-base mb-3">Place Payment Hold</h2>
            <p className="text-sm text-gray-500 mb-4">
              Student: <strong>{holdModal.studentName}</strong>
            </p>
            {error && (
              <p className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-xl mb-3">
                {error}
              </p>
            )}
            <div className="mb-4">
              <label className="label">
                Reason <span className="text-danger">*</span>
              </label>
              <textarea
                rows={4}
                className="input w-full resize-none"
                placeholder="Explain why this student's access should be suspended..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                minLength={10}
              />
              <p className="text-xs text-gray-400 mt-1">
                {reason.length} / 10 characters minimum
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={() => {
                  setHoldModal(null);
                  setReason("");
                  setError("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={handlePlaceHold}
                disabled={loading || reason.trim().length < 10}
              >
                {loading ? "Placing..." : "Place Hold"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lift Hold Modal */}
      {liftModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full">
            <h2 className="font-semibold text-base mb-3">Lift Payment Hold</h2>
            <p className="text-sm text-gray-500 mb-4">
              Student: <strong>{liftModal.studentName}</strong>
            </p>
            {error && (
              <p className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-xl mb-3">
                {error}
              </p>
            )}
            <div className="mb-4">
              <label className="label">
                Reason <span className="text-danger">*</span>
              </label>
              <textarea
                rows={4}
                className="input w-full resize-none"
                placeholder="Explain why this hold is being lifted..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                minLength={10}
              />
              <p className="text-xs text-gray-400 mt-1">
                {reason.length} / 10 characters minimum
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={() => {
                  setLiftModal(null);
                  setReason("");
                  setError("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={handleLiftHold}
                disabled={loading || reason.trim().length < 10}
              >
                {loading ? "Lifting..." : "Lift Hold"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
