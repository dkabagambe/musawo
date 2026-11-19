"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertTriangle, Clock, Loader2, Play, XCircle } from "lucide-react";

type JobRun = {
  id: string;
  jobKey: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  output: string | null;
  error: string | null;
  triggeredBy: string;
};

type Job = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  schedule: string;
  runnable: boolean;
  active: boolean;
  lastRun: JobRun | null;
};

type Props = {
  jobs: Job[];
  recentFailures: JobRun[];
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  SUCCESS: <CheckCircle className="w-4 h-4 text-green-500" />,
  FAILED: <XCircle className="w-4 h-4 text-red-500" />,
  RUNNING: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
  SKIPPED: <Clock className="w-4 h-4 text-gray-400" />,
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

export default function JobsDashboard({ jobs, recentFailures }: Props) {
  const router = useRouter();
  const [running, setRunning] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<Record<string, string>>({});

  async function triggerJob(key: string) {
    setRunning(key);
    setRunResult((prev) => ({ ...prev, [key]: "" }));
    try {
      const res = await fetch("/api/system/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobKey: key }),
      });
      const d = (await res.json()) as { runId?: string; error?: string };
      if (!res.ok) {
        setRunResult((prev) => ({ ...prev, [key]: d.error ?? "Failed" }));
      } else {
        setRunResult((prev) => ({ ...prev, [key]: `Started (run ${d.runId?.slice(0, 8)})` }));
        setTimeout(() => router.refresh(), 3000);
      }
    } catch {
      setRunResult((prev) => ({ ...prev, [key]: "Network error" }));
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Recent failures */}
      {recentFailures.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="font-semibold text-sm text-red-700">
              {recentFailures.length} job failure{recentFailures.length !== 1 ? "s" : ""} in last 48 hours
            </p>
          </div>
          <div className="space-y-2">
            {recentFailures.map((run) => (
              <div key={run.id} className="bg-white rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-red-700">{run.jobKey}</span>
                  <span className="text-xs text-gray-400">{timeAgo(run.startedAt)}</span>
                </div>
                {run.error && (
                  <p className="text-xs text-gray-600 mt-1 font-mono">{run.error.slice(0, 200)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Job list */}
      <div className="space-y-3">
        {jobs.length === 0 && (
          <div className="card text-center py-12 text-gray-400">
            <Clock className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No jobs defined. Run demo:reset to seed job definitions.</p>
          </div>
        )}
        {jobs.map((job) => (
          <div
            key={job.key}
            className={`card ${!job.active ? "opacity-60" : ""}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {job.lastRun ? STATUS_ICON[job.lastRun.status] ?? <Clock className="w-4 h-4 text-gray-300" /> : <Clock className="w-4 h-4 text-gray-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-semibold text-sm">{job.label}</p>
                    <p className="text-xs text-gray-500 font-mono">{job.key}</p>
                  </div>
                  {job.runnable && job.active && (
                    <button
                      type="button"
                      onClick={() => void triggerJob(job.key)}
                      disabled={running === job.key}
                      className="btn-secondary text-xs inline-flex items-center gap-1.5 flex-shrink-0"
                    >
                      {running === job.key
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Play className="w-3 h-3" />}
                      Run now
                    </button>
                  )}
                </div>
                {job.description && <p className="text-xs text-gray-500 mt-1">{job.description}</p>}
                <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                  <span>Schedule: <span className="font-mono">{job.schedule}</span></span>
                  {job.lastRun && (
                    <>
                      <span>
                        Last run: <span className={`font-medium ${job.lastRun.status === "SUCCESS" ? "text-green-700" : job.lastRun.status === "FAILED" ? "text-red-600" : "text-gray-700"}`}>
                          {job.lastRun.status}
                        </span> {timeAgo(job.lastRun.startedAt)}
                      </span>
                      {job.lastRun.durationMs != null && (
                        <span>Duration: {job.lastRun.durationMs < 1000 ? `${job.lastRun.durationMs}ms` : `${(job.lastRun.durationMs / 1000).toFixed(1)}s`}</span>
                      )}
                    </>
                  )}
                  {!job.lastRun && <span className="text-gray-400">Never run</span>}
                </div>
                {job.lastRun?.error && (
                  <p className="text-xs text-red-600 font-mono mt-1 bg-red-50 rounded px-2 py-1">
                    {job.lastRun.error.slice(0, 300)}
                  </p>
                )}
                {job.lastRun?.output && job.lastRun.status === "SUCCESS" && (
                  <p className="text-xs text-gray-500 mt-1">{job.lastRun.output.slice(0, 200)}</p>
                )}
                {runResult[job.key] && (
                  <p className="text-xs text-primary mt-1">{runResult[job.key]}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
