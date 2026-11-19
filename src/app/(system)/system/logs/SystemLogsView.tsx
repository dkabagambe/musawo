"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, RefreshCw, Search } from "lucide-react";

type Log = {
  id: string;
  level: "INFO" | "WARN" | "ERROR";
  source: string;
  route: string | null;
  requestId: string | null;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type ErrorGroup = {
  source: string;
  level: string;
  _count: { id: number };
};

const LEVEL_BADGE: Record<string, string> = {
  INFO: "bg-blue-50 text-blue-700",
  WARN: "bg-amber-50 text-amber-800",
  ERROR: "bg-red-50 text-red-700",
};

function timeStr(date: string) {
  return new Date(date).toLocaleString("en-UG", { dateStyle: "short", timeStyle: "medium" });
}

export default function SystemLogsView() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [errorGroups, setErrorGroups] = useState<ErrorGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const loadLogs = useCallback(async (pg = 1) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(pg) });
      if (levelFilter !== "ALL") params.set("level", levelFilter);
      if (sourceFilter !== "ALL") params.set("source", sourceFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/system/logs?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load logs");
      const d = (await res.json()) as {
        logs: Log[];
        total: number;
        page: number;
        totalPages: number;
        errorGroups: ErrorGroup[];
      };
      setLogs(d.logs);
      setTotal(d.total);
      setPage(d.page);
      setTotalPages(d.totalPages);
      setErrorGroups(d.errorGroups);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [levelFilter, sourceFilter, search]);

  useEffect(() => { void loadLogs(1); }, [loadLogs]);

  function handleSearch(val: string) {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearch(val), 400);
  }

  function exportCsv() {
    const rows = [["Time", "Level", "Source", "Route", "Message", "RequestID"]];
    for (const log of logs) {
      rows.push([
        timeStr(log.createdAt),
        log.level,
        log.source,
        log.route ?? "",
        log.message.replace(/,/g, ";"),
        log.requestId ?? "",
      ]);
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="space-y-5">
      {/* Error groups (last 24h) */}
      {errorGroups.length > 0 && (
        <div className="card">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Top errors (last 24h)</p>
          <div className="flex flex-wrap gap-2">
            {errorGroups.map((g, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setSourceFilter(g.source); setLevelFilter(g.level); }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors hover:border-primary ${LEVEL_BADGE[g.level] ?? ""}`}
              >
                <span className="font-mono">{g.source}</span>
                <span className="font-bold">{g._count.id}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            className="input pl-9 text-sm"
            placeholder="Search logs..."
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <select className="input text-sm max-w-[120px]" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
          <option value="ALL">All levels</option>
          <option value="ERROR">Error</option>
          <option value="WARN">Warning</option>
          <option value="INFO">Info</option>
        </select>
        <select className="input text-sm max-w-[140px]" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="ALL">All sources</option>
          <option value="api">API</option>
          <option value="cron">Cron</option>
          <option value="auth">Auth</option>
          <option value="storage">Storage</option>
          <option value="email">Email</option>
          <option value="payment">Payment</option>
        </select>
        <button type="button" onClick={() => void loadLogs(1)} disabled={loading} className="btn-ghost text-sm inline-flex items-center gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
        <button type="button" onClick={exportCsv} className="btn-ghost text-sm inline-flex items-center gap-1.5 ml-auto">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <p className="text-sm text-gray-500">{total.toLocaleString()} entries</p>

      {error && <p className="text-red-600 bg-red-50 rounded-xl p-3 text-sm">{error}</p>}
      {loading && (
        <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
        </div>
      )}

      {/* Log entries */}
      <div className="card overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-3 w-32">Time</th>
              <th className="pb-2 font-medium pr-3 w-16">Level</th>
              <th className="pb-2 font-medium pr-3 w-24">Source</th>
              <th className="pb-2 font-medium pr-3 w-32">Route</th>
              <th className="pb-2 font-medium">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50/50">
                <td className="py-1.5 pr-3 text-gray-400 whitespace-nowrap">{timeStr(log.createdAt)}</td>
                <td className="py-1.5 pr-3">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${LEVEL_BADGE[log.level] ?? ""}`}>
                    {log.level}
                  </span>
                </td>
                <td className="py-1.5 pr-3 font-mono text-gray-600">{log.source}</td>
                <td className="py-1.5 pr-3 font-mono text-gray-400 truncate max-w-[128px]">{log.route ?? "-"}</td>
                <td className="py-1.5 text-gray-700">
                  <span className="break-words">{log.message.slice(0, 200)}</span>
                  {log.requestId && (
                    <span className="ml-2 text-gray-300 font-mono">[{log.requestId.slice(0, 8)}]</span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  No log entries match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button type="button" disabled={page === 1} onClick={() => void loadLogs(page - 1)} className="btn-ghost text-sm disabled:opacity-40">
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button type="button" disabled={page === totalPages} onClick={() => void loadLogs(page + 1)} className="btn-ghost text-sm disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
