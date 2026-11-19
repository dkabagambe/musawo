"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Loader2, RefreshCw } from "lucide-react";

type AlertItem = {
  id: string;
  ruleKey: string;
  severity: "WARNING" | "CRITICAL";
  title: string;
  description: string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  metadata: Record<string, unknown> | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800",
  WARNING: "bg-amber-100 text-amber-800",
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AlertsDashboard() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/system/alerts?status=${statusFilter}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load alerts");
      const d = (await res.json()) as { alerts: AlertItem[]; total: number };
      setAlerts(d.alerts);
      setTotal(d.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void loadAlerts(); }, [loadAlerts]);

  async function act(id: string, action: "acknowledge" | "resolve") {
    setActing(id);
    try {
      await fetch("/api/system/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      await loadAlerts();
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          {["OPEN", "ACKNOWLEDGED", "RESOLVED", "ALL"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                statusFilter === s
                  ? "bg-primary text-white border-primary"
                  : "border-border text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s[0] + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void loadAlerts()}
          disabled={loading}
          className="btn-ghost text-sm inline-flex items-center gap-1.5 ml-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <p className="text-sm text-gray-500">{total} alert{total !== 1 ? "s" : ""}</p>

      {error && <p className="text-red-600 bg-red-50 rounded-xl p-3 text-sm">{error}</p>}

      {loading && (
        <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
        </div>
      )}

      {!loading && alerts.length === 0 && (
        <div className="card text-center py-16">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            No {statusFilter !== "ALL" ? statusFilter.toLowerCase() : ""} alerts.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`card border-l-4 ${
              alert.severity === "CRITICAL" ? "border-l-red-500" : "border-l-amber-400"
            }`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${
                    alert.severity === "CRITICAL" ? "text-red-500" : "text-amber-500"
                  }`} />
                  <span className="font-semibold text-sm">{alert.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_BADGE[alert.severity]}`}>
                    {alert.severity}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">{alert.ruleKey}</span>
                </div>
                <p className="text-sm text-gray-700 ml-6">{alert.description}</p>
                <p className="text-xs text-gray-400 ml-6 mt-1">
                  {timeAgo(alert.createdAt)}
                  {alert.acknowledgedAt && ` - acknowledged ${timeAgo(alert.acknowledgedAt)}`}
                  {alert.resolvedAt && ` - resolved ${timeAgo(alert.resolvedAt)}`}
                </p>
              </div>
              {alert.status === "OPEN" && (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => void act(alert.id, "acknowledge")}
                    disabled={acting === alert.id}
                    className="btn-ghost text-xs"
                  >
                    {acting === alert.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Acknowledge"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void act(alert.id, "resolve")}
                    disabled={acting === alert.id}
                    className="btn-primary text-xs"
                  >
                    Resolve
                  </button>
                </div>
              )}
              {alert.status === "ACKNOWLEDGED" && (
                <button
                  type="button"
                  onClick={() => void act(alert.id, "resolve")}
                  disabled={acting === alert.id}
                  className="btn-primary text-xs flex-shrink-0"
                >
                  Resolve
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
