"use client";

import React, { useState } from "react";
import type { StorageUsageSummary } from "@/lib/storage/retention";

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// ─── Types (duplicated here so no server-only lib is imported in this client component) ──

interface CleanupJobSummary {
  id: string;
  intakeLabel: string;
  status: string;
  totalSizeBytes: number;
  itemCount: number;
  confirmedAt: string | null;
  executeAfter: string | null;
  executedAt: string | null;
  createdAt: string;
  confirmedByName: string | null;
}

interface Props {
  usage: StorageUsageSummary;
  jobs: CleanupJobSummary[];
  canManage: boolean; // Principal only
}

const STATUS_BADGE: Record<string, string> = {
  PENDING_CONFIRMATION: "badge-warning",
  IN_TRASH:             "badge-danger",
  CONFIRMED:            "badge-info",
  EXECUTED:             "bg-gray-100 text-gray-500",
  CANCELLED:            "bg-gray-100 text-gray-400",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_CONFIRMATION: "Awaiting confirmation",
  IN_TRASH:             "In trash",
  CONFIRMED:            "Confirmed",
  EXECUTED:             "Deleted",
  CANCELLED:            "Cancelled",
};

// ─── Storage bar ─────────────────────────────────────────────────────────────

function StorageBar({ usedPercent, isWarning }: { usedPercent: number; isWarning: boolean }) {
  const pct = Math.min(usedPercent, 100);
  return (
    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden" role="progressbar"
         aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
         aria-label={`${pct}% storage used`}>
      <div
        className={`h-full rounded-full transition-all ${isWarning ? "bg-red-500" : "bg-primary"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Job action buttons ────────────────────────────────────────────────────────

function JobActions({
  jobId,
  status,
  onDone,
}: {
  jobId: string;
  status: string;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "confirm" | "cancel") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/storage/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, action }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed");
      } else {
        onDone();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (status !== "PENDING_CONFIRMATION") return null;

  return (
    <div className="flex gap-2 mt-3">
      <button
        className="btn-primary text-sm px-4 py-1"
        disabled={loading}
        onClick={() => act("confirm")}
        type="button"
      >
        {loading ? "Working..." : "Confirm clear (move to 14-day trash)"}
      </button>
      <button
        className="btn-secondary text-sm px-4 py-1"
        disabled={loading}
        onClick={() => act("cancel")}
        type="button"
      >
        Cancel
      </button>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ─── Item list modal ───────────────────────────────────────────────────────────

function ItemListModal({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const [items, setItems] = useState<null | unknown[]>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetch(`/api/storage/jobs/${jobId}`)
      .then((r) => r.json())
      .then((d) => { setItems(d.itemsJson ?? []); setLoading(false); });
  }, [jobId]);

  type Item = {
    type: string;
    fileName: string;
    courseTitle: string;
    sizeBytes: number;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
         role="dialog" aria-modal="true" aria-label="Cleanup job file list">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-lg">Files in cleanup job</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                  aria-label="Close">x</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : !items?.length ? (
            <p className="text-gray-500 text-sm">No files listed.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-border">
                  <th className="pb-2 pr-4">File</th>
                  <th className="pb-2 pr-4">Course</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2">Size</th>
                </tr>
              </thead>
              <tbody>
                {(items as Item[]).map((item, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-surface/50">
                    <td className="py-2 pr-4 font-mono text-xs truncate max-w-[180px]">
                      {item.fileName}
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{item.courseTitle}</td>
                    <td className="py-2 pr-4">
                      <span className="badge badge-info text-xs">
                        {item.type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">
                      {item.sizeBytes > 0 ? fmtBytes(item.sizeBytes) : "link"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main dashboard component ─────────────────────────────────────────────────

export default function StorageDashboard({ usage, jobs: initialJobs, canManage }: Props) {
  const [jobs, setJobs] = useState(initialJobs);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/storage");
    if (res.ok) {
      const d = await res.json();
      setJobs(d.jobs);
    }
  }

  const usedGb = (usage.totalUsedBytes / (1024 ** 3)).toFixed(2);
  const totalGb = usage.totalQuotaGb;

  return (
    <div className="space-y-8">
      {/* ── Usage summary ── */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Storage Usage</h2>
          {usage.isWarning && (
            <span className="badge badge-danger text-xs animate-pulse">
              Warning: {usage.usedPercent}% used
            </span>
          )}
        </div>
        <div className="mb-2 flex justify-between text-sm text-gray-600">
          <span>{usedGb} GB used</span>
          <span>{usage.usedPercent}% of {totalGb} GB</span>
        </div>
        <StorageBar usedPercent={usage.usedPercent} isWarning={usage.isWarning} />
        <p className="text-xs text-gray-400 mt-2">
          Warning threshold: {usage.warningPercent}%. Total quota: {totalGb} GB.
          Update the &quot;storage.total_gb&quot; setting when your plan changes.
        </p>
      </section>

      {/* ── Per-course breakdown ── */}
      {usage.perCourse.length > 0 && (
        <section className="card">
          <h2 className="font-semibold text-lg mb-4">Per Course</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-border">
                  <th className="pb-2 pr-4">Course</th>
                  <th className="pb-2 pr-4">Notes</th>
                  <th className="pb-2 pr-4">Presentations</th>
                  <th className="pb-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {usage.perCourse.map((c) => (
                  <tr key={c.courseId} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium">{c.courseTitle}</td>
                    <td className="py-2 pr-4 text-gray-500">{fmtBytes(c.notesBytes)}</td>
                    <td className="py-2 pr-4 text-gray-500">{fmtBytes(c.presentationsBytes)}</td>
                    <td className="py-2 font-medium">{fmtBytes(c.totalBytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Cleanup jobs ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Cleanup Jobs</h2>
          <span className="text-xs text-gray-400">
            Scheduled jobs list previous-intake files for clearing.
            Notes and slides are permanently deleted after the trash period.
            External recording links are only unlinked.
          </span>
        </div>

        {jobs.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-3xl mb-3">🗄️</p>
            <p className="text-gray-500 text-sm">
              No cleanup jobs yet. Jobs are created automatically when an intake ends.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{job.intakeLabel}</h3>
                      <span className={`badge text-xs ${STATUS_BADGE[job.status] ?? "badge-info"}`}>
                        {STATUS_LABEL[job.status] ?? job.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {job.itemCount} file{job.itemCount !== 1 ? "s" : ""} &bull; {fmtBytes(job.totalSizeBytes)} to free
                    </p>
                    {job.confirmedByName && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Confirmed by {job.confirmedByName}
                        {job.confirmedAt
                          ? ` on ${new Date(job.confirmedAt).toLocaleDateString("en-UG")}`
                          : ""}
                      </p>
                    )}
                    {job.executeAfter && job.status === "IN_TRASH" && (
                      <p className="text-xs text-amber-700 mt-0.5">
                        Permanent deletion after{" "}
                        {new Date(job.executeAfter).toLocaleDateString("en-UG")}
                      </p>
                    )}
                    {job.executedAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Deleted {new Date(job.executedAt).toLocaleDateString("en-UG")}
                      </p>
                    )}
                  </div>
                  <button
                    className="btn-secondary text-xs px-3 py-1 flex-shrink-0"
                    onClick={() => setPreviewJobId(job.id)}
                    type="button"
                  >
                    Preview files
                  </button>
                </div>

                {canManage && (
                  <JobActions
                    jobId={job.id}
                    status={job.status}
                    onDone={refresh}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Never-delete notice ── */}
      <section className="card bg-surface border-border">
        <p className="text-xs text-gray-500">
          <strong>Protected records (never deleted):</strong> marks, attendance,
          exam results, certificates, payments and audit logs. External recording
          links (Google Meet, Drive) are only unlinked; the bytes are not owned by
          this platform.
        </p>
      </section>

      {/* ── Item list modal ── */}
      {previewJobId && (
        <ItemListModal
          jobId={previewJobId}
          onClose={() => setPreviewJobId(null)}
        />
      )}
    </div>
  );
}
