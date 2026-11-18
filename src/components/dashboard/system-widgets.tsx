import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  Zap,
  HardDrive,
  Activity,
  AlertTriangle,
  Server,
  Shield,
  Package,
  GitBranch,
  Terminal,
} from "lucide-react";
import type { UserRole } from "@prisma/client";

export interface SystemWidgetProps {
  userId: string;
  role: UserRole;
  fullPageHref?: string;
}

/* ─────────────────────────────────────────────
   System Health Widgets (NO BUSINESS DATA)
   Shows only technical system metrics, never
   business audit events or user actions
   ───────────────────────────────────────────── */

function StatusTile({
  label,
  value,
  status,
  icon: Icon,
}: {
  label: string;
  value: string;
  status: "success" | "warning" | "error" | "info";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const statusColors = {
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    error: "text-red-600 dark:text-red-400",
    info: "text-blue-600 dark:text-blue-400",
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <Icon className={`h-8 w-8 ${statusColors[status]}`} />
      <div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {value}
        </div>
      </div>
    </div>
  );
}

function LogEntry({
  timestamp,
  level,
  message,
  source,
}: {
  timestamp: string;
  level: "error" | "warning" | "info";
  message: string;
  source: string;
}) {
  const levelColors = {
    error: "text-red-600 dark:text-red-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    info: "text-gray-600 dark:text-gray-400",
  };

  return (
    <div className="py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex items-start gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          {timestamp}
        </span>
        <span className={`text-xs font-medium ${levelColors[level]}`}>
          {level.toUpperCase()}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          [{source}]
        </span>
      </div>
      <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{message}</p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
      {children}
    </p>
  );
}

// ══════════════════════════════════════════════════════════════════
// GENERAL TAB WIDGETS
// ══════════════════════════════════════════════════════════════════

export async function SystemHealthOverview(_props: SystemWidgetProps) {
  // Mock data - replace with real health checks
  return (
    <div className="space-y-3">
      <StatusTile
        label="Database"
        value="Healthy"
        status="success"
        icon={Database}
      />
      <StatusTile
        label="API"
        value="Operational"
        status="success"
        icon={Server}
      />
      <StatusTile
        label="Background Jobs"
        value="3 active"
        status="info"
        icon={Zap}
      />
      <StatusTile
        label="Storage"
        value="67% used"
        status="warning"
        icon={HardDrive}
      />
    </div>
  );
}

export async function SystemCriticalAlerts(_props: SystemWidgetProps) {
  // Mock data - replace with real alerts from monitoring system
  const alerts = [
    {
      id: 1,
      level: "warning" as const,
      message: "Database connection pool at 80% capacity",
      source: "database",
      timestamp: "2026-11-18T14:32:00",
    },
  ];

  if (alerts.length === 0) {
    return (
      <Empty>
        <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
        No critical alerts
      </Empty>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <LogEntry
          key={alert.id}
          timestamp={new Date(alert.timestamp).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          level={alert.level}
          message={alert.message}
          source={alert.source}
        />
      ))}
    </div>
  );
}

export async function SystemRecentDeployments(_props: SystemWidgetProps) {
  // Mock data - replace with real deployment log
  const deployments = [
    {
      id: 1,
      version: "v2.4.1",
      deployedAt: "2026-11-17T22:15:00",
      deployedBy: "CI/CD",
      status: "success" as const,
    },
    {
      id: 2,
      version: "v2.4.0",
      deployedAt: "2026-11-16T18:30:00",
      deployedBy: "CI/CD",
      status: "success" as const,
    },
    {
      id: 3,
      version: "v2.3.9",
      deployedAt: "2026-11-15T14:20:00",
      deployedBy: "CI/CD",
      status: "success" as const,
    },
  ];

  if (deployments.length === 0) {
    return <Empty>No recent deployments</Empty>;
  }

  return (
    <div className="space-y-2">
      {deployments.map((deployment) => (
        <div
          key={deployment.id}
          className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
        >
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {deployment.version}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(deployment.deployedAt).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
          {deployment.status === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
        </div>
      ))}
    </div>
  );
}

export async function SystemBackupStatus(_props: SystemWidgetProps) {
  // Mock data - replace with real backup status
  const backups = {
    database: {
      lastBackup: "2026-11-18T02:00:00",
      status: "success" as const,
      size: "1.2 GB",
    },
    files: {
      lastBackup: "2026-11-18T03:00:00",
      status: "success" as const,
      size: "3.4 GB",
    },
  };

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Database Backup
          </span>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Last: {new Date(backups.database.lastBackup).toLocaleString("en-GB")}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Size: {backups.database.size}
        </div>
      </div>
      <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            File Storage Backup
          </span>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Last: {new Date(backups.files.lastBackup).toLocaleString("en-GB")}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Size: {backups.files.size}
        </div>
      </div>
    </div>
  );
}

export async function SystemJobFailures(_props: SystemWidgetProps) {
  // Mock data - replace with real job failure log
  const failures = [
    {
      id: 1,
      jobName: "email-queue-processor",
      failedAt: "2026-11-18T12:45:00",
      error: "SMTP connection timeout",
    },
  ];

  if (failures.length === 0) {
    return (
      <Empty>
        <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
        No job failures in the last 24 hours
      </Empty>
    );
  }

  return (
    <div className="space-y-2">
      {failures.map((failure) => (
        <div
          key={failure.id}
          className="p-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950"
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-sm font-medium text-red-900 dark:text-red-100">
              {failure.jobName}
            </span>
          </div>
          <div className="text-xs text-red-700 dark:text-red-300">
            {failure.error}
          </div>
          <div className="text-xs text-red-600 dark:text-red-400 mt-1">
            {new Date(failure.failedAt).toLocaleString("en-GB")}
          </div>
        </div>
      ))}
    </div>
  );
}

export async function SystemLoadMetrics(_props: SystemWidgetProps) {
  // Mock data - replace with real system load metrics
  return (
    <div className="space-y-3">
      <StatusTile
        label="CPU Usage"
        value="34%"
        status="success"
        icon={Activity}
      />
      <StatusTile
        label="Memory Usage"
        value="58%"
        status="success"
        icon={Server}
      />
      <StatusTile label="Disk I/O" value="12 MB/s" status="info" icon={Zap} />
      <StatusTile
        label="Active Connections"
        value="142"
        status="info"
        icon={Activity}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SYSTEM TAB WIDGETS
// ══════════════════════════════════════════════════════════════════

export async function SystemPerformanceMetrics(_props: SystemWidgetProps) {
  // Mock data - replace with real performance metrics
  const metrics = [
    { label: "Avg Response Time", value: "124 ms", status: "success" as const },
    { label: "p95 Response Time", value: "340 ms", status: "success" as const },
    { label: "p99 Response Time", value: "780 ms", status: "warning" as const },
    { label: "Requests/min", value: "2,341", status: "info" as const },
    { label: "Cache Hit Rate", value: "87%", status: "success" as const },
    { label: "DB Query Time (avg)", value: "45 ms", status: "success" as const },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {metrics.map((metric, i) => (
        <StatusTile
          key={i}
          label={metric.label}
          value={metric.value}
          status={metric.status}
          icon={Activity}
        />
      ))}
    </div>
  );
}

export async function SystemErrorRates(_props: SystemWidgetProps) {
  // Mock data - replace with real error rate tracking
  const errorRates = [
    { label: "4xx Errors (24h)", value: "34", status: "info" as const },
    { label: "5xx Errors (24h)", value: "2", status: "success" as const },
    { label: "DB Errors (24h)", value: "0", status: "success" as const },
    { label: "Timeouts (24h)", value: "5", status: "warning" as const },
  ];

  return (
    <div className="space-y-3">
      {errorRates.map((rate, i) => (
        <StatusTile
          key={i}
          label={rate.label}
          value={rate.value}
          status={rate.status}
          icon={AlertTriangle}
        />
      ))}
    </div>
  );
}

export async function SystemResourceUsage(_props: SystemWidgetProps) {
  // Mock data - replace with real resource monitoring
  return (
    <div className="space-y-3">
      <StatusTile
        label="Database Connections"
        value="45 / 100"
        status="success"
        icon={Database}
      />
      <StatusTile
        label="Storage Used"
        value="67.2 GB / 100 GB"
        status="warning"
        icon={HardDrive}
      />
      <StatusTile
        label="Memory Used"
        value="3.2 GB / 8 GB"
        status="success"
        icon={Server}
      />
      <StatusTile
        label="CPU Cores Used"
        value="2.1 / 4"
        status="success"
        icon={Activity}
      />
    </div>
  );
}

export async function SystemDatabaseHealth(_props: SystemWidgetProps) {
  // Mock data - replace with real database health checks
  return (
    <div className="space-y-3">
      <StatusTile
        label="Connection Status"
        value="Connected"
        status="success"
        icon={Database}
      />
      <StatusTile
        label="Query Performance"
        value="45ms avg"
        status="success"
        icon={Zap}
      />
      <StatusTile
        label="Active Queries"
        value="12"
        status="info"
        icon={Activity}
      />
      <StatusTile
        label="Connection Pool"
        value="45 / 100"
        status="success"
        icon={Database}
      />
    </div>
  );
}

export async function SystemApiHealth(_props: SystemWidgetProps) {
  // Mock data - replace with real API health monitoring
  const endpoints = [
    { path: "/api/auth", status: "success" as const, latency: "24ms" },
    { path: "/api/students", status: "success" as const, latency: "56ms" },
    { path: "/api/courses", status: "success" as const, latency: "43ms" },
    { path: "/api/payments", status: "success" as const, latency: "78ms" },
  ];

  return (
    <div className="space-y-2">
      {endpoints.map((endpoint, i) => (
        <div
          key={i}
          className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
        >
          <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
            {endpoint.path}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {endpoint.latency}
            </span>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// LOGS TAB WIDGETS
// ══════════════════════════════════════════════════════════════════

export async function SystemErrorLog(_props: SystemWidgetProps) {
  // Mock data - replace with real error log from database
  const errors = [
    {
      id: 1,
      timestamp: "2026-11-18T14:32:15",
      level: "error" as const,
      message: "Database connection pool exhausted",
      source: "database",
      count: 3,
    },
    {
      id: 2,
      timestamp: "2026-11-18T13:15:42",
      level: "warning" as const,
      message: "Slow query detected (>500ms)",
      source: "database",
      count: 1,
    },
    {
      id: 3,
      timestamp: "2026-11-18T12:45:30",
      level: "error" as const,
      message: "SMTP connection timeout",
      source: "email",
      count: 1,
    },
  ];

  if (errors.length === 0) {
    return <Empty>No errors in the last 24 hours</Empty>;
  }

  return (
    <div className="space-y-2">
      {errors.map((error) => (
        <div key={error.id}>
          <LogEntry
            timestamp={new Date(error.timestamp).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
            level={error.level}
            message={error.message}
            source={error.source}
          />
          {error.count > 1 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 ml-20">
              Occurred {error.count} times
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export async function SystemSecurityEvents(_props: SystemWidgetProps) {
  // Mock data - replace with real security event log
  const events = [
    {
      id: 1,
      timestamp: "2026-11-18T14:20:00",
      level: "warning" as const,
      message: "Failed login attempt from unknown IP",
      source: "auth",
    },
    {
      id: 2,
      timestamp: "2026-11-18T11:30:00",
      level: "info" as const,
      message: "2FA enabled for user account",
      source: "security",
    },
    {
      id: 3,
      timestamp: "2026-11-18T09:15:00",
      level: "info" as const,
      message: "Session expired and cleaned up",
      source: "auth",
    },
  ];

  if (events.length === 0) {
    return <Empty>No security events in the last 24 hours</Empty>;
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <LogEntry
          key={event.id}
          timestamp={new Date(event.timestamp).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          level={event.level}
          message={event.message}
          source={event.source}
        />
      ))}
    </div>
  );
}

export async function SystemJobRuns(_props: SystemWidgetProps) {
  // Mock data - replace with real background job log
  const jobs = [
    {
      id: 1,
      name: "email-queue-processor",
      startedAt: "2026-11-18T14:30:00",
      duration: "2.3s",
      status: "success" as const,
    },
    {
      id: 2,
      name: "backup-database",
      startedAt: "2026-11-18T02:00:00",
      duration: "45s",
      status: "success" as const,
    },
    {
      id: 3,
      name: "cleanup-expired-sessions",
      startedAt: "2026-11-18T01:00:00",
      duration: "1.2s",
      status: "success" as const,
    },
  ];

  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <div
          key={job.id}
          className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
        >
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {job.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(job.startedAt).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" • "}
                {job.duration}
              </div>
            </div>
          </div>
          {job.status === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
        </div>
      ))}
    </div>
  );
}

export async function SystemDeploymentLog(_props: SystemWidgetProps) {
  // Mock data - replace with real deployment history
  const deployments = [
    {
      id: 1,
      version: "v2.4.1",
      deployedAt: "2026-11-17T22:15:00",
      deployedBy: "CI/CD",
      duration: "2m 15s",
      status: "success" as const,
      changes: ["Fix: Email notification bug", "Update: Dependencies"],
    },
    {
      id: 2,
      version: "v2.4.0",
      deployedAt: "2026-11-16T18:30:00",
      deployedBy: "CI/CD",
      duration: "2m 45s",
      status: "success" as const,
      changes: ["Feature: IT Admin portal", "Fix: Session handling"],
    },
  ];

  return (
    <div className="space-y-4">
      {deployments.map((deployment) => (
        <div
          key={deployment.id}
          className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {deployment.version}
              </span>
            </div>
            {deployment.status === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {new Date(deployment.deployedAt).toLocaleString("en-GB")} •{" "}
            {deployment.duration}
          </div>
          <ul className="space-y-1">
            {deployment.changes.map((change, i) => (
              <li
                key={i}
                className="text-xs text-gray-600 dark:text-gray-400 pl-4"
              >
                • {change}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export async function SystemIntegrationLogs(_props: SystemWidgetProps) {
  // Mock data - replace with real integration logs
  const logs = [
    {
      id: 1,
      integration: "SMTP",
      timestamp: "2026-11-18T14:32:00",
      level: "error" as const,
      message: "Connection timeout",
    },
    {
      id: 2,
      integration: "S3",
      timestamp: "2026-11-18T13:15:00",
      level: "info" as const,
      message: "File upload successful",
    },
    {
      id: 3,
      integration: "Payment Gateway",
      timestamp: "2026-11-18T12:45:00",
      level: "info" as const,
      message: "Transaction processed",
    },
  ];

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <LogEntry
          key={log.id}
          timestamp={new Date(log.timestamp).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          level={log.level}
          message={log.message}
          source={log.integration}
        />
      ))}
    </div>
  );
}
