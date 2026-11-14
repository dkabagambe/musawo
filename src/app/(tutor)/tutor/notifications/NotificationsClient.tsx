"use client";

import { useState } from "react";
import { Bell, CheckCheck, Check, Settings } from "lucide-react";

type Notif = {
  id: string;
  type: string;
  subject: string | null;
  body: string;
  createdAt: string;
  readAt: string | null;
};

type Pref = {
  channel: string;
  type: string;
  enabled: boolean;
};

const TYPE_ICON: Record<string, string> = {
  CLASS_REMINDER: "📅",
  MARKS_CHANGE: "📝",
  SYSTEM_ALERT: "⚠️",
  ANNOUNCEMENT: "📢",
  DIRECT_MESSAGE: "✉️",
  EXAM_MARKED: "✅",
  EXAM_REVIEW: "📋",
  TAB_SWITCH_ALERT: "🚨",
  ASSIGNMENT_SUBMITTED: "📩",
  CLASS_RESCHEDULED: "🔄",
  CLASS_CANCELLED: "❌",
};

const PREF_TYPES = [
  { type: "CLASS_REMINDER", label: "Class reminders" },
  { type: "DIRECT_MESSAGE", label: "Direct messages" },
  { type: "ANNOUNCEMENT", label: "Announcements" },
  { type: "ASSIGNMENT_SUBMITTED", label: "Assignment submissions" },
  { type: "EXAM_MARKED", label: "Exam marked" },
  { type: "CLASS_RESCHEDULED", label: "Class rescheduled" },
  { type: "CLASS_CANCELLED", label: "Class cancelled" },
];

export default function NotificationsClient({
  initial,
  initialPrefs,
}: {
  initial: Notif[];
  initialPrefs: Pref[];
}) {
  const [notifications, setNotifications] = useState(initial);
  const [prefs, setPrefs] = useState(initialPrefs);
  const [showPrefs, setShowPrefs] = useState(false);
  const [marking, setMarking] = useState<string | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const unread = notifications.filter((n) => !n.readAt).length;

  async function markOne(id: string) {
    setMarking(id);
    try {
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setNotifications((ns) =>
          ns.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
        );
      }
    } finally {
      setMarking(null);
    }
  }

  async function markAll() {
    const res = await fetch("/api/notifications/mark-all-read", { method: "POST" });
    if (res.ok) {
      setNotifications((ns) => ns.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    }
  }

  function isPrefEnabled(type: string, channel = "IN_APP") {
    const p = prefs.find((p) => p.type === type && p.channel === channel);
    return p ? p.enabled : true; // default on
  }

  async function togglePref(type: string, channel = "IN_APP") {
    const current = isPrefEnabled(type, channel);
    const next = !current;
    setSavingPrefs(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, channel, enabled: next }),
      });
      if (res.ok) {
        setPrefs((ps) => {
          const existing = ps.find((p) => p.type === type && p.channel === channel);
          if (existing) return ps.map((p) => p.type === type && p.channel === channel ? { ...p, enabled: next } : p);
          return [...ps, { type, channel, enabled: next }];
        });
      }
    } finally {
      setSavingPrefs(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">{unread > 0 ? `${unread} unread` : "All caught up"}</p>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button onClick={markAll} className="btn-outline text-sm flex items-center gap-1.5">
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
          <button
            onClick={() => setShowPrefs((v) => !v)}
            aria-pressed={showPrefs}
            className={`btn-outline text-sm flex items-center gap-1.5 ${showPrefs ? "border-primary text-primary" : ""}`}
          >
            <Settings className="w-3.5 h-3.5" /> Preferences
          </button>
        </div>
      </div>

      {/* Preferences panel */}
      {showPrefs && (
        <div className="card space-y-4" aria-label="Notification preferences">
          <h2 className="font-semibold text-sm text-primary">Notification preferences</h2>
          <p className="text-xs text-gray-500">Choose which in-app notifications you receive.</p>
          {savingPrefs && <p className="text-xs text-primary">Saving...</p>}
          <div className="divide-y divide-border">
            {PREF_TYPES.map(({ type, label }) => {
              const enabled = isPrefEnabled(type);
              return (
                <label key={type} className="flex items-center justify-between gap-4 py-3 cursor-pointer">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                  <button
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => togglePref(type)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                      enabled ? "bg-primary" : "bg-gray-200 dark:bg-gray-600"
                    }`}
                  >
                    <span
                      className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                        enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Notification list */}
      {notifications.length === 0 ? (
        <div className="card py-16 text-center">
          <Bell className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              data-testid="notification-item"
              className={`card flex items-start gap-4 ${!n.readAt ? "border-primary/20 bg-primary/5 dark:bg-primary/10" : ""}`}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? "🔔"}</span>
              <div className="flex-1 min-w-0">
                {n.subject && <p className="font-semibold text-sm text-primary">{n.subject}</p>}
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{n.body}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.createdAt).toLocaleString("en-UG")}
                  {!n.readAt && <span className="ml-2 font-semibold text-primary">New</span>}
                </p>
              </div>
              {!n.readAt && (
                <button
                  onClick={() => markOne(n.id)}
                  disabled={marking === n.id}
                  aria-label="Mark as read"
                  className="flex-shrink-0 p-1.5 rounded-lg hover:bg-surface transition-colors text-gray-400 hover:text-primary"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
