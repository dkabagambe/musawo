"use client";

import { useCallback, useEffect, useState } from "react";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Download, 
  Loader2, 
  Play, 
  RefreshCw, 
  XCircle 
} from "lucide-react";

type BackupRecord = {
  id: string;
  filename: string;
  startedAt: string;
  finishedAt: string | null;
  status: "SUCCESS" | "FAILED" | "RUNNING";
  sizeBytes: number | null;
  checksum: string | null;
  errorMessage: string | null;
  type: "NIGHTLY" | "MANUAL" | "VERIFICATION";
};

type BackupStats = {
  totalBackups: number;
  lastBackup: BackupRecord | null;
  lastVerification: {
    date: string;
    result: "SUCCESS" | "FAILED";
    duration: number;
  } | null;
  storageUsed: number;
  nextScheduled: string;
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  SUCCESS: <CheckCircle className="w-4 h-4 text-green-500" />,
  FAILED: <XCircle className="w-4 h-4 text-red-500" />,
  RUNNING: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function BackupsDashboard() {
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [backing, setBacking] = useState(false);
  const [backupResult, setBackupResult] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/system/backups", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load backups");
      const data = (await res.json()) as { stats: BackupStats; backups: BackupRecord[] };
      setStats(data.stats);
      setBackups(data.backups);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function triggerBackup() {
    setBacking(true);
    setBackupResult("");
    try {
      const res = await fetch("/api/system/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "backup" }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string; message?: string };
      if (!res.ok) {
        setBackupResult(data.error ?? "Backup failed");
      } else {
        setBackupResult(data.message ?? "Backup started successfully");
        setTimeout(() => void load(), 3000);
      }
    } catch (e) {
      setBackupResult(e instanceof Error ? e.message : "Network error");
    } finally {
      setBacking(false);
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center gap-2 text-gray-400 py-16 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading backup data...
      </div>
    );
  }

  if (error && !stats) {
    return <p className="text-red-600 bg-red-50 rounded-xl p-4 text-sm">{error}</p>;
  }

  if (!stats) return null;

  const lastBackupAge = stats.lastBackup 
    ? (Date.now() - new Date(stats.lastBackup.startedAt).getTime()) / 3600000 
    : null;
  const overdue = lastBackupAge !== null && lastBackupAge > 26;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`card ${overdue ? "border-red-200 bg-red-50" : ""}`}>
          <p className="text-xs text-gray-500 mb-1">Last Backup</p>
          {stats.lastBackup ? (
            <>
              <p className={`text-lg font-bold ${overdue ? "text-red-700" : "text-primary"}`}>
                {timeAgo(stats.lastBackup.startedAt)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.lastBackup.status === "SUCCESS" 
                  ? formatBytes(stats.lastBackup.sizeBytes ?? 0)
                  : stats.lastBackup.status}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">No backups yet</p>
          )}
        </div>

        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Total Backups</p>
          <p className="text-lg font-bold text-primary">{stats.totalBackups}</p>
          <p className="text-xs text-gray-500 mt-1">30 daily + 12 monthly</p>
        </div>

        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Storage Used</p>
          <p className="text-lg font-bold text-primary">{formatBytes(stats.storageUsed)}</p>
        </div>

        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Last Verification</p>
          {stats.lastVerification ? (
            <>
              <p className={`text-lg font-bold ${
                stats.lastVerification.result === "SUCCESS" ? "text-green-600" : "text-red-600"
              }`}>
                {stats.lastVerification.result}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(stats.lastVerification.date).toLocaleDateString("en-UG")}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">Not run yet</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          type="button"
          onClick={triggerBackup}
          disabled={backing}
          className="btn-primary inline-flex items-center gap-2"
        >
          {backing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Back up now
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="btn-ghost text-sm inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {backupResult && (
        <div className={`rounded-xl p-3 text-sm ${
          backupResult.includes("success") || backupResult.includes("started")
            ? "bg-green-50 text-green-800"
            : "bg-red-50 text-red-800"
        }`}>
          {backupResult}
        </div>
      )}

      {overdue && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-red-800 mb-1">Backup Overdue</p>
              <p className="text-red-700">
                Last backup was {lastBackupAge?.toFixed(1)} hours ago. Target: every 24 hours.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Backup list */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Backup History
        </h2>
        {backups.length === 0 ? (
          <div className="card text-center py-16">
            <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium mb-2">No backups on record</p>
            <p className="text-sm text-gray-400">
              Click "Back up now" to create your first backup
            </p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-border">
                  <th className="pb-2 font-medium pr-3">Date & Time</th>
                  <th className="pb-2 font-medium pr-3">Filename</th>
                  <th className="pb-2 font-medium pr-3">Type</th>
                  <th className="pb-2 font-medium pr-3">Status</th>
                  <th className="pb-2 font-medium pr-3 text-right">Size</th>
                  <th className="pb-2 font-medium">Checksum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-gray-50/50">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {new Date(backup.startedAt).toLocaleString("en-UG", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">{backup.filename}</td>
                    <td className="py-2 pr-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        backup.type === "NIGHTLY" ? "bg-blue-100 text-blue-700" :
                        backup.type === "MANUAL" ? "bg-purple-100 text-purple-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {backup.type}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1.5">
                        {STATUS_ICON[backup.status]}
                        <span className={
                          backup.status === "SUCCESS" ? "text-green-700" :
                          backup.status === "FAILED" ? "text-red-700" :
                          "text-blue-700"
                        }>
                          {backup.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {backup.sizeBytes ? formatBytes(backup.sizeBytes) : "-"}
                    </td>
                    <td className="py-2 font-mono text-xs text-gray-500">
                      {backup.checksum ? backup.checksum.slice(0, 12) + "..." : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Important note */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Backup Security</p>
            <p>
              Backups are encrypted and stored in S3-compatible storage. Downloads are NOT available
              through this interface. Restore procedures are documented in the Runbook and require
              Director approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
