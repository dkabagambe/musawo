"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  XCircle,
  Minus,
} from "lucide-react";

type ServiceStatus = "ok" | "degraded" | "error" | "unconfigured";

type ServiceCheck = {
  name: string;
  status: ServiceStatus;
  latencyMs?: number;
  detail?: string;
  checkedAt: string;
};

type LoadInfo = {
  onlineUsers: number | null;
  liveClasses: number;
  activeExams: number;
};

type BackupInfo = {
  status: string;
  startedAt: string;
  durationMs: number | null;
  ageHours: number;
  overdue: boolean;
} | null;

type AppInfo = {
  version: string;
  commit: string;
  env: string;
  nodeVersion: string;
  uptime: number;
};

type HealthData = {
  status: ServiceStatus;
  services: ServiceCheck[];
  load: LoadInfo;
  lastBackup: BackupInfo;
  openAlerts: number;
  app: AppInfo;
  checkedAt: string;
};

const STATUS_ICON: Record<ServiceStatus, React.ReactNode> = {
  ok: <CheckCircle className="w-5 h-5 text-green-500" />,
  degraded: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  unconfigured: <Minus className="w-5 h-5 text-gray-400" />,
};

const STATUS_BG: Record<ServiceStatus, string> = {
  ok: "bg-green-50 border-green-200",
  degraded: "bg-amber-50 border-amber-200",
  error: "bg-red-50 border-red-200",
  unconfigured: "bg-gray-50 border-gray-200",
};

const STATUS_LABEL: Record<ServiceStatus, string> = {
  ok: "Healthy",
  degraded: "Degraded",
  error: "Error",
  unconfigured: "Not configured",
};

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function SystemHealthDashboard() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/system/health", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load health data");
      setData(await res.json() as HealthData);
      setLastRefreshed(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 30000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-gray-400 py-16 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading system status...
      </div>
    );
  }

  if (error && !data) {
    return <p className="text-red-600 bg-red-50 rounded-xl p-4 text-sm">{error}</p>;
  }

  if (!data) return null;

  const overallColor =
    data.status === "ok" ? "text-green-700 bg-green-50 border-green-200" :
    data.status === "degraded" ? "text-amber-700 bg-amber-50 border-amber-200" :
    "text-red-700 bg-red-50 border-red-200";

  return (
    <div className="space-y-6">
      {/* Overall status banner */}
      <div className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${overallColor}`}>
        <div className="flex items-center gap-3">
          {STATUS_ICON[data.status]}
          <div>
            <p className="font-semibold capitalize">
              System {data.status === "ok" ? "Healthy" : data.status === "degraded" ? "Degraded" : "Issues Detected"}
            </p>
            <p className="text-xs opacity-70">
              {data.openAlerts > 0 ? `${data.openAlerts} open alert${data.openAlerts > 1 ? "s" : ""}` : "No open alerts"}
              {" "}&middot; Checked {new Date(data.checkedAt).toLocaleTimeString("en-UG")}
            </p>
          </div>
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

      {/* Services grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.services.map((svc) => (
            <div key={svc.name} className={`rounded-xl border p-4 flex items-start gap-3 ${STATUS_BG[svc.status]}`}>
              <div className="flex-shrink-0 mt-0.5">{STATUS_ICON[svc.status]}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{svc.name}</p>
                <p className={`text-xs font-medium ${
                  svc.status === "ok" ? "text-green-700" :
                  svc.status === "degraded" ? "text-amber-700" :
                  svc.status === "error" ? "text-red-700" : "text-gray-500"
                }`}>
                  {STATUS_LABEL[svc.status]}
                  {svc.latencyMs != null && ` - ${svc.latencyMs}ms`}
                </p>
                {svc.detail && <p className="text-xs text-gray-500 mt-0.5">{svc.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current load */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Current Load</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary">
              {data.load.onlineUsers != null ? data.load.onlineUsers : "n/a"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Users online</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary">{data.load.liveClasses}</p>
            <p className="text-xs text-gray-500 mt-1">Live classes running</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary">{data.load.activeExams}</p>
            <p className="text-xs text-gray-500 mt-1">Active exam sessions</p>
          </div>
        </div>
      </div>

      {/* Last backup */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Last Backup</h2>
        {data.lastBackup ? (
          <div className={`card flex items-start gap-3 ${data.lastBackup.overdue ? "border-red-200 bg-red-50" : ""}`}>
            {data.lastBackup.status === "SUCCESS"
              ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              : <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />}
            <div>
              <p className="text-sm font-medium">
                {data.lastBackup.status} &middot; {data.lastBackup.ageHours}h ago
                {data.lastBackup.overdue && <span className="ml-2 text-red-600 font-semibold">OVERDUE</span>}
              </p>
              <p className="text-xs text-gray-500">
                Started {new Date(data.lastBackup.startedAt).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })}
                {data.lastBackup.durationMs != null && ` - ${Math.round(data.lastBackup.durationMs / 1000)}s`}
              </p>
            </div>
          </div>
        ) : (
          <div className="card text-sm text-gray-500 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            No backup on record. Run the nightly-backup job from the Jobs page.
          </div>
        )}
      </div>

      {/* App info */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Application</h2>
        <div className="card">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-gray-500">Version</dt>
              <dd className="font-mono font-medium">{data.app.version}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Commit</dt>
              <dd className="font-mono text-xs">{data.app.commit}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Environment</dt>
              <dd className={`font-medium ${data.app.env === "production" ? "text-green-700" : "text-amber-600"}`}>
                {data.app.env}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Node.js</dt>
              <dd className="font-mono text-xs">{data.app.nodeVersion}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Uptime</dt>
              <dd>{formatUptime(data.app.uptime)}</dd>
            </div>
            {lastRefreshed && (
              <div>
                <dt className="text-xs text-gray-500">Last refreshed</dt>
                <dd className="text-xs">{lastRefreshed.toLocaleTimeString("en-UG")}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
