"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Clock, Database, Loader2, RefreshCw } from "lucide-react";

type DatabaseInfo = {
  version: string;
  size: string;
  connectionPool: {
    max: number;
    active: number;
    idle: number;
    waiting: number;
  };
  tables: Array<{
    name: string;
    sizeBytes: number;
    rowCount: number;
    indexes: number;
  }>;
  slowQueries: Array<{
    query: string;
    avgDuration: number;
    calls: number;
  }>;
  migrations: {
    applied: number;
    pending: number;
    lastMigration: string;
  };
  indexHints: Array<{
    table: string;
    column: string;
    suggestion: string;
  }>;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export default function DatabaseDiagnostics() {
  const [data, setData] = useState<DatabaseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/system/database", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load database info");
      setData((await res.json()) as DatabaseInfo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-gray-400 py-16 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading database diagnostics...
      </div>
    );
  }

  if (error && !data) {
    return <p className="text-red-600 bg-red-50 rounded-xl p-4 text-sm">{error}</p>;
  }

  if (!data) return null;

  const poolUsage = (data.connectionPool.active / data.connectionPool.max) * 100;
  const poolWarning = poolUsage > 80;

  return (
    <div className="space-y-6">
      {/* Database info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">PostgreSQL Version</p>
          <p className="text-lg font-bold text-primary">{data.version}</p>
        </div>

        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Total Size</p>
          <p className="text-lg font-bold text-primary">{data.size}</p>
        </div>

        <div className={`card ${poolWarning ? "border-amber-200 bg-amber-50" : ""}`}>
          <p className="text-xs text-gray-500 mb-1">Connection Pool</p>
          <p className={`text-lg font-bold ${poolWarning ? "text-amber-700" : "text-primary"}`}>
            {data.connectionPool.active} / {data.connectionPool.max}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {poolUsage.toFixed(0)}% used ({data.connectionPool.idle} idle, {data.connectionPool.waiting} waiting)
          </p>
        </div>
      </div>

      {poolWarning && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800 mb-1">High Connection Pool Usage</p>
              <p className="text-amber-700">
                Connection pool is at {poolUsage.toFixed(0)}%. Consider increasing the pool size if this persists.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Migration status */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Migration Status
        </h2>
        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {data.migrations.pending === 0 ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {data.migrations.applied} migrations applied
                  {data.migrations.pending > 0 && `, ${data.migrations.pending} pending`}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Last migration: {data.migrations.lastMigration}
                </p>
              </div>
            </div>
            {data.migrations.pending > 0 && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                Action needed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Table sizes */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Table Sizes (Top 15)
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-3">Table</th>
                <th className="pb-2 font-medium pr-3 text-right">Size</th>
                <th className="pb-2 font-medium pr-3 text-right">Rows</th>
                <th className="pb-2 font-medium text-right">Indexes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.tables.map((table) => (
                <tr key={table.name} className="hover:bg-gray-50/50">
                  <td className="py-2 pr-3 font-mono text-xs">{table.name}</td>
                  <td className="py-2 pr-3 text-right">{formatBytes(table.sizeBytes)}</td>
                  <td className="py-2 pr-3 text-right">{table.rowCount.toLocaleString()}</td>
                  <td className="py-2 text-right">{table.indexes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slow queries */}
      {data.slowQueries.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Slow Queries (Top 10)
          </h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-400 border-b border-border">
                  <th className="pb-2 font-medium pr-3">Query</th>
                  <th className="pb-2 font-medium pr-3 text-right">Avg Duration</th>
                  <th className="pb-2 font-medium text-right">Calls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.slowQueries.map((query, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="py-2 pr-3 font-mono max-w-md truncate">{query.query}</td>
                    <td className={`py-2 pr-3 text-right ${query.avgDuration > 1000 ? "text-red-600 font-medium" : ""}`}>
                      {query.avgDuration.toFixed(2)}ms
                    </td>
                    <td className="py-2 text-right">{query.calls.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Index hints */}
      {data.indexHints.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Index Recommendations
          </h2>
          <div className="space-y-2">
            {data.indexHints.map((hint, i) => (
              <div key={i} className="card border-amber-200 bg-amber-50">
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-900">
                      {hint.table}.{hint.column}
                    </p>
                    <p className="text-amber-700 mt-1">{hint.suggestion}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security note */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Read-Only Diagnostics</p>
            <p>
              This page shows database health metrics only. No SQL console, row data access, or
              write operations are available. All metrics are cached for 60 seconds.
            </p>
          </div>
        </div>
      </div>

      {/* Refresh button */}
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
