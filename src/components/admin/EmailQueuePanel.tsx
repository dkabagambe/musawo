"use client";

/**
 * EmailQueuePanel - shared UI for the failed-email queue.
 * Used by /admin/email-queue and /system/email-queue.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Mail, RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle,
  ChevronLeft, ChevronRight
} from "lucide-react";

interface QueueRow {
  id: string;
  to: string;
  subject: string;
  template: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface QueueData {
  total: number;
  page: number;
  perPage: number;
  rows: QueueRow[];
}

const STATUS_OPTIONS = ["PENDING", "SENT", "ABANDONED"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

const STATUS_BADGE: Record<StatusFilter, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  SENT: "bg-green-100 text-green-800",
  ABANDONED: "bg-red-100 text-red-800",
};

export default function EmailQueuePanel() {
  const [status, setStatus] = useState<StatusFilter>("PENDING");
  const [page, setPage]     = useState(1);
  const [data, setData]     = useState<QueueData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryMsg, setRetryMsg] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/email-queue?status=${status}&page=${page}`,
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setData(await res.json() as QueueData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue.");
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleRetry() {
    setRetrying(true);
    setRetryMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/email-queue", { method: "POST" });
      const j = await res.json() as { retried?: number; failed?: number; message?: string; error?: string; hint?: string };
      if (!res.ok) {
        setError(j.error ?? "Retry failed.");
        if (j.hint) setError((j.error ?? "Retry failed.") + " " + j.hint);
      } else {
        setRetryMsg(j.message ?? "Done.");
        void fetchData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed.");
    } finally {
      setRetrying(false);
    }
  }

  const totalPages = data ? Math.ceil(data.total / data.perPage) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Email Queue</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Failed outbound emails. Demo mode: emails are logged, not sent until a verified Resend domain and API key are configured.
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
                status === s
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-600 border-gray-300 hover:border-primary"
              }`}
            >
              {s}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void fetchData()}
            disabled={loading}
            className="btn-outline text-sm flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {status === "PENDING" && (
            <button
              type="button"
              onClick={() => void handleRetry()}
              disabled={retrying || loading}
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              {retrying ? "Retrying..." : "Retry all pending"}
            </button>
          )}
        </div>
      </div>

      {/* Demo notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <strong>Demo mode:</strong> Emails are stored here and logged to the console instead of being sent.
          Real sending requires a verified <code>mtc.ac.ug</code> domain in Resend and
          <code>APP_ENV=production</code>. See <strong>docs/EMAIL-DNS.md</strong> for setup steps.
          Student set-password and activation links work in demo mode via the{" "}
          <a href="/dev/mail" className="underline font-medium" target="_blank" rel="noopener noreferrer">
            /dev/mail preview
          </a>
          .
        </div>
      </div>

      {/* Errors / success */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <span className="text-sm text-red-800">{error}</span>
        </div>
      )}
      {retryMsg && !error && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
          <span className="text-sm text-green-800">{retryMsg}</span>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold">
            {status} emails{" "}
            {data && (
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[status]}`}>
                {data.total}
              </span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
            Loading...
          </div>
        ) : !data || data.rows.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p>No {status.toLowerCase()} emails.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead>
                <tr>
                  <th>To</th>
                  <th>Subject</th>
                  <th>Template</th>
                  <th>Attempts</th>
                  <th>Last error</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono text-xs">{row.to}</td>
                    <td>{row.subject}</td>
                    <td>
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                        {row.template}
                      </code>
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          row.attempts >= 5 ? "text-red-600" : "text-yellow-700"
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {row.attempts}
                      </span>
                    </td>
                    <td className="max-w-xs truncate text-xs text-gray-500">
                      {row.lastError ?? "-"}
                    </td>
                    <td className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString("en-UG", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-2">
            <span className="text-sm text-gray-500">
              Page {data.page} of {totalPages} ({data.total} total)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-outline text-sm flex items-center gap-1 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-outline text-sm flex items-center gap-1 disabled:opacity-40"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
