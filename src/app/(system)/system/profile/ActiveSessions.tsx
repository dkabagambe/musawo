"use client";

import { useState, useEffect } from "react";
import { Monitor, Smartphone, LogOut, RefreshCw, MapPin, Clock } from "lucide-react";

interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string | null;
  isCurrent: boolean;
  lastActive: string;
  createdAt: string;
}

export default function ActiveSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);

  async function loadSessions() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/profile/sessions");
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to load sessions");
      }

      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  async function revokeSession(sessionId: string) {
    if (!confirm("Sign out this device? You'll need to log in again on that device.")) {
      return;
    }

    setRevoking(sessionId);
    setError("");

    try {
      const res = await fetch("/api/profile/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to revoke session");
      }

      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke session");
    } finally {
      setRevoking(null);
    }
  }

  async function revokeAllOthers() {
    if (!confirm("Sign out all other devices? You'll need to log in again on those devices.")) {
      return;
    }

    setRevoking("all");
    setError("");

    try {
      const res = await fetch("/api/profile/sessions/revoke-all", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to revoke sessions");
      }

      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke sessions");
    } finally {
      setRevoking(null);
    }
  }

  function getDeviceIcon(device: string) {
    const lower = device.toLowerCase();
    if (lower.includes("mobile") || lower.includes("phone") || lower.includes("android") || lower.includes("ios")) {
      return <Smartphone className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  }

  if (loading) {
    return (
      <div className="pt-6 border-t border-border">
        <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-3">
          Active Sessions
        </h2>
        <p className="text-sm text-gray-500">Loading sessions...</p>
      </div>
    );
  }

  return (
    <div className="pt-6 border-t border-border">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">
          Active Sessions
        </h2>
        <button
          onClick={loadSessions}
          disabled={loading}
          className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        These devices are currently signed in to your account. If you see a device you don't recognize, sign it out immediately.
      </p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200 mb-4">
          {error}
        </p>
      )}

      {sessions.length === 0 ? (
        <p className="text-sm text-gray-500">No active sessions found.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`p-4 rounded-lg border ${
                session.isCurrent
                  ? "border-green-200 bg-green-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-gray-600 mt-1">
                  {getDeviceIcon(session.device)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {session.browser} on {session.os}
                    </p>
                    {session.isCurrent && (
                      <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span>{session.ip}</span>
                      {session.location && <span>· {session.location}</span>}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span>
                        Last active: {new Date(session.lastActive).toLocaleString("en-UG", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-gray-400">
                      Signed in: {new Date(session.createdAt).toLocaleString("en-UG", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {!session.isCurrent && (
                  <button
                    onClick={() => revokeSession(session.id)}
                    disabled={revoking === session.id || revoking === "all"}
                    className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50 flex items-center gap-1"
                  >
                    <LogOut className="h-4 w-4" />
                    {revoking === session.id ? "Signing out..." : "Sign out"}
                  </button>
                )}
              </div>
            </div>
          ))}

          {sessions.filter((s) => !s.isCurrent).length > 0 && (
            <button
              onClick={revokeAllOthers}
              disabled={revoking === "all"}
              className="btn-secondary text-sm w-full inline-flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              {revoking === "all" ? "Signing out..." : "Sign Out All Other Devices"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
