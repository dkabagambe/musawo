"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Clock, Loader2, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";

type PerformanceData = {
  totalRequests: number;
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
  slowestRoutes: Array<{
    route: string;
    count: number;
    errors: number;
    errorRate: number;
    p50: number;
    p95: number;
  }>;
  byRoute: Array<{
    route: string;
    count: number;
    errors: number;
    errorRate: number;
    p50: number;
    p95: number;
  }>;
};

export default function PerformanceDashboard() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoursBack, setHoursBack] = useState(24);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/system/performance?hours=${hoursBack}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load performance data");
      setData(await res.json() as PerformanceData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [hoursBack]);

  useEffect(() => { void load(); }, [load]);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-gray-400 py-16 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading performance data...
      </div>
    );
  }

  if (error && !data) {
    return <p className="text-red-600 bg-red-50 rounded-xl p-4 text-sm">{error}</p>;
  }

  if (!data) return null;

  const p95Warning = data.p95 > 1000;
  const errorRateWarning = data.errorRate > 1;

  return (
    <div className="space-y-6">
      {/* Time range selector */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          {[1, 6, 24, 168].map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHoursBack(h)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                hoursBack === h
                  ? "bg-primary text-white border-primary"
                  : "border-border text-gray-600 hover:bg-gray-50"
              }`}
            >
              {h === 1 ? "1h" : h === 6 ? "6h" : h === 24 ? "24h" : "7d"}
            </button>
          ))}
        </div>
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

      {/* Alerts */}
      {(p95Warning || errorRateWarning) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800 mb-1">Performance Issues Detected</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                {p95Warning && <li>P95 response time exceeds 1 second ({data.p95}ms)</li>}
                {errorRateWarning && <li>Error rate exceeds 1% ({data.errorRate.toFixed(2)}%)</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Total Requests</p>
          <p className="text-2xl font-bold text-primary">{data.totalRequests.toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">P50 (median)</p>
          <p className="text-2xl font-bold text-primary">{data.p50}ms</p>
        </div>
        <div className={`card ${p95Warning ? "border-amber-200 bg-amber-50" : ""}`}>
          <p className="text-xs text-gray-500 mb-1">P95</p>
          <div className="flex items-center gap-2">
            <p className={`text-2xl font-bold ${p95Warning ? "text-amber-700" : "text-primary"}`}>
              {data.p95}ms
            </p>
            {p95Warning && <TrendingUp className="w-5 h-5 text-amber-600" />}
          </div>
        </div>
        <div className={`card ${errorRateWarning ? "border-red-200 bg-red-50" : ""}`}>
          <p className="text-xs text-gray-500 mb-1">Error Rate</p>
          <div className="flex items-center gap-2">
            <p className={`text-2xl font-bold ${errorRateWarning ? "text-red-700" : "text-primary"}`}>
              {data.errorRate.toFixed(2)}%
            </p>
            {errorRateWarning && <TrendingUp className="w-5 h-5 text-red-600" />}
          </div>
        </div>
      </div>

      {/* Slowest routes */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Slowest Routes (by P95)
        </h2>
        {data.slowestRoutes.length === 0 ? (
          <div className="card text-center py-8 text-gray-400">
            <Clock className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No data yet. Metrics are collected starting now.</p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-border">
                  <th className="pb-2 font-medium pr-3">Route</th>
                  <th className="pb-2 font-medium pr-3 text-right">Requests</th>
                  <th className="pb-2 font-medium pr-3 text-right">Errors</th>
                  <th className="pb-2 font-medium pr-3 text-right">Error %</th>
                  <th className="pb-2 font-medium pr-3 text-right">P50</th>
                  <th className="pb-2 font-medium text-right">P95</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.slowestRoutes.map((route, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="py-2 pr-3 font-mono text-xs">{route.route}</td>
                    <td className="py-2 pr-3 text-right">{route.count.toLocaleString()}</td>
                    <td className="py-2 pr-3 text-right">{route.errors}</td>
                    <td className="py-2 pr-3 text-right">
                      <span className={route.errorRate > 5 ? "text-red-600 font-medium" : ""}>
                        {route.errorRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right">{route.p50}ms</td>
                    <td className="py-2 text-right">
                      <span className={route.p95 > 1000 ? "text-amber-700 font-bold" : "font-medium"}>
                        {route.p95}ms
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All routes */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          All Routes
        </h2>
        {data.byRoute.length === 0 ? (
          <div className="card text-center py-8 text-gray-400">
            <p className="text-sm">No route data available</p>
          </div>
        ) : (
          <div className="card overflow-x-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-gray-400 border-b border-border">
                  <th className="pb-2 font-medium pr-3">Route</th>
                  <th className="pb-2 font-medium pr-3 text-right">Requests</th>
                  <th className="pb-2 font-medium pr-3 text-right">Errors</th>
                  <th className="pb-2 font-medium pr-3 text-right">P50</th>
                  <th className="pb-2 font-medium text-right">P95</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.byRoute.map((route, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="py-1.5 pr-3 font-mono">{route.route}</td>
                    <td className="py-1.5 pr-3 text-right">{route.count}</td>
                    <td className="py-1.5 pr-3 text-right text-gray-500">{route.errors}</td>
                    <td className="py-1.5 pr-3 text-right">{route.p50}ms</td>
                    <td className="py-1.5 text-right">{route.p95}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
