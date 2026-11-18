"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Intake {
  id: string;
  name: string;
  endDate: string;
  studentCount: number;
}

interface Props {
  intakes: Intake[];
}

export default function StorageClearingForm({ intakes }: Props) {
  const router = useRouter();
  const [intakeId, setIntakeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [storageData, setStorageData] = useState<{
    recordings: number;
    notes: number;
    uploads: number;
    cache: number;
    total: number;
  } | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const selectedIntake = intakes.find((i) => i.id === intakeId);

  async function calculateStorage() {
    if (!intakeId) return;
    
    setCalculating(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/storage/calculate?intakeId=${intakeId}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? "Failed to calculate storage.");
        return;
      }

      const data = await res.json() as {
        recordings: number;
        notes: number;
        uploads: number;
        cache: number;
        total: number;
      };
      setStorageData(data);
    } catch (err) {
      setError("Failed to calculate storage usage.");
      console.error(err);
    } finally {
      setCalculating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!intakeId || !storageData) {
      setError("Please calculate storage first.");
      return;
    }

    setLoading(true);
    setError("");

    const reason = [
      `Storage Clearing Request`,
      `Intake: ${selectedIntake?.name}`,
      `Students: ${selectedIntake?.studentCount}`,
      `End date: ${selectedIntake ? new Date(selectedIntake.endDate).toLocaleDateString("en-UG") : ""}`,
      ``,
      `Storage breakdown:`,
      `- Recordings: ${formatBytes(storageData.recordings)}`,
      `- Notes: ${formatBytes(storageData.notes)}`,
      `- Uploads: ${formatBytes(storageData.uploads)}`,
      `- Cache: ${formatBytes(storageData.cache)}`,
      `Total size: ${formatBytes(storageData.total)}`,
      ``,
      notes.trim() ? `Notes: ${notes.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "STORAGE_CLEARING",
          reason,
          metadata: {
            intakeId,
            storageData,
          },
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? "Failed to submit request.");
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
    setIntakeId("");
    setStorageData(null);
    setNotes("");
    setSuccess(false);
    setError("");
  }

  if (success) {
    return (
      <div className="text-center py-10">
        <p className="text-3xl mb-3">✅</p>
        <p className="text-green-800 font-semibold mb-2">
          Storage clearing request submitted to Principal
        </p>
        <p className="text-sm text-gray-500 mb-4">
          The Principal will review and confirm the clearing list.
        </p>
        <button className="btn-primary text-sm" onClick={resetForm}>
          Submit Another Request
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

      <div>
        <label className="label">
          Select Intake <span className="text-danger">*</span>
        </label>
        <select
          required
          className="input w-full"
          value={intakeId}
          onChange={(e) => {
            setIntakeId(e.target.value);
            setStorageData(null); // Reset calculation
          }}
        >
          <option value="">-- Select closed intake --</option>
          {intakes.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} (ended {new Date(i.endDate).toLocaleDateString("en-UG")}) - {i.studentCount} students
            </option>
          ))}
        </select>
      </div>

      {intakeId && !storageData && (
        <div>
          <button
            type="button"
            onClick={calculateStorage}
            disabled={calculating}
            className="btn-outline"
          >
            {calculating ? "Calculating..." : "Calculate Storage Usage"}
          </button>
          <p className="text-xs text-gray-400 mt-2">
            Click to analyze storage used by this intake
          </p>
        </div>
      )}

      {storageData && (
        <div className="card bg-gray-50 dark:bg-gray-800">
          <h3 className="font-semibold text-sm mb-3">Storage Breakdown</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Recordings:</span>
              <span className="font-medium">{formatBytes(storageData.recordings)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Notes & Materials:</span>
              <span className="font-medium">{formatBytes(storageData.notes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Temporary Uploads:</span>
              <span className="font-medium">{formatBytes(storageData.uploads)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cached Content:</span>
              <span className="font-medium">{formatBytes(storageData.cache)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-semibold">Total to Clear:</span>
              <span className="font-bold text-primary">{formatBytes(storageData.total)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={calculateStorage}
            disabled={calculating}
            className="btn-ghost text-xs mt-3"
          >
            Recalculate
          </button>
        </div>
      )}

      <div>
        <label className="label">Notes for Principal (optional)</label>
        <textarea
          rows={3}
          className="input w-full resize-none"
          placeholder="Additional context or special considerations..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {storageData && (
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
      )}
    </form>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
