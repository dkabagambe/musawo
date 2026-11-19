"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, HardDrive, Loader2, RefreshCw, Upload } from "lucide-react";

type StorageInfo = {
  status: "ok" | "error" | "unconfigured";
  bucket: string;
  usedBytes: number;
  usedPercent: number;
  totalBytes: number | null;
  categories: Array<{
    name: string;
    count: number;
    sizeBytes: number;
  }>;
  weeklyGrowthBytes: number;
  retentionJob: {
    lastRun: string | null;
    itemsCleared: number;
    trashCount: number;
  };
  testResult: string | null;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export default function StorageDashboard() {
  const [data, setData] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/system/storage", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load storage info");
      setData((await res.json()) as StorageInfo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runTest() {
    setTesting(true);
    setTestResult("");
    try {
      const res = await fetch("/api/system/storage/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = (await res.json()) as { success?: boolean; error?: string; message?: string };
      setTestResult(result.message ?? result.error ?? "Test completed");
    } catch (e) {
      setTestResult(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTesting(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-gray-400 py-16 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading storage info...
      </div>
    );
  }

  if (error && !data) {
    return <p className="text-red-600 bg-red-50 rounded-xl p-4 text-sm">{error}</p>;
  }

  if (!data) return null;

  const storageWarning = data.usedPercent > 80;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${
        data.status === "ok" ? "border-green-200 bg-green-50" :
        data.status === "error" ? "border-red-200 bg-red-50" :
        "border-gray-200 bg-gray-50"
      }`}>
        <div className="flex items-center gap-3">
          {data.status === "ok" ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : data.status === "error" ? (
            <AlertTriangle className="w-5 h-5 text-red-500" />
          ) : (
            <HardDrive className="w-5 h-5 text-gray-400" />
          )}
          <div>
            <p className="font-semibold text-sm">
              {data.status === "ok" ? "Storage Healthy" :
               data.status === "error" ? "Storage Issues" :
               "Storage Not Configured"}
            </p>
            <p className="text-xs opacity-70">Bucket: {data.bucket}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={runTest}
          disabled={testing}
          className="btn-ghost text-sm inline-flex items-center gap-1.5"
        >
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Test
        </button>
      </div>

      {testResult && (
        <div className={`rounded-xl p-3 text-sm ${
          testResult.includes("success") || testResult.includes("Success")
            ? "bg-green-50 text-green-800"
            : "bg-red-50 text-red-800"
        }`}>
          {testResult}
        </div>
      )}

      {/* Usage stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`card ${storageWarning ? "border-amber-200 bg-amber-50" : ""}`}>
          <p className="text-xs text-gray-500 mb-1">Storage Used</p>
          <p className={`text-lg font-bold ${storageWarning ? "text-amber-700" : "text-primary"}`}>
            {formatBytes(data.usedBytes)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {data.usedPercent.toFixed(1)}% used
            {data.totalBytes && ` of ${formatBytes(data.totalBytes)}`}
          </p>
        </div>

        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Weekly Growth</p>
          <p className="text-lg font-bold text-primary">{formatBytes(data.weeklyGrowthBytes)}</p>
          <p className="text-xs text-gray-500 mt-1">Average per week</p>
        </div>

        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Trash Items</p>
          <p className="text-lg font-bold text-primary">{data.retentionJob.trashCount}</p>
          <p className="text-xs text-gray-500 mt-1">Pending cleanup</p>
        </div>
      </div>

      {storageWarning && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800 mb-1">Storage Warning</p>
              <p className="text-amber-700">
                Storage usage is at {data.usedPercent.toFixed(1)}%. Consider cleaning up old files
                or increasing storage capacity.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Storage by Category
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-3">Category</th>
                <th className="pb-2 font-medium pr-3 text-right">Files</th>
                <th className="pb-2 font-medium text-right">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.categories.map((cat) => (
                <tr key={cat.name} className="hover:bg-gray-50/50">
                  <td className="py-2 pr-3">{cat.name}</td>
                  <td className="py-2 pr-3 text-right">{cat.count.toLocaleString()}</td>
                  <td className="py-2 text-right font-medium">{formatBytes(cat.sizeBytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Retention job */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Retention Job
        </h2>
        <div className="card">
          <div className="flex items-start gap-3">
            {data.retentionJob.lastRun ? (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-medium text-sm">
                {data.retentionJob.lastRun
                  ? `Last run: ${new Date(data.retentionJob.lastRun).toLocaleString("en-UG")}`
                  : "Never run"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {data.retentionJob.itemsCleared > 0
                  ? `Cleared ${data.retentionJob.itemsCleared} items in last run`
                  : "No items cleared yet"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {data.retentionJob.trashCount} items in trash (14-day window)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Security note */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <HardDrive className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Storage Oversight</p>
            <p>
              This page shows storage statistics and categories without exposing file names or
              business data. File access requires appropriate role permissions.
            </p>
          </div>
        </div>
      </div>

      {/* Refresh */}
      <div className="flex justify-end">
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
  );
}
