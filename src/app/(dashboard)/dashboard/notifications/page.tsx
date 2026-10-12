"use client";

import { useState, useEffect } from "react";

interface Notification {
  id: string;
  type: string;
  subject: string | null;
  body: string;
  readAt: string | null;
  createdAt: string;
  channel: string;
}

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Mark all as read
    fetch("/api/notifications/mark-read", { method: "POST" }).catch(() => {});
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl mb-6">Notifications</h1>

      {loading && (
        <div className="text-center py-10 text-gray-400">Loading…</div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-3xl mb-3" aria-hidden="true">🔔</p>
          <p className="text-gray-500 text-sm">No notifications yet.</p>
        </div>
      )}

      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`card transition-colors ${
              !n.readAt ? "border-accent/30 bg-accent/5" : ""
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-lg" aria-hidden="true">
                {n.channel === "EMAIL"
                  ? "📧"
                  : n.channel === "SMS"
                  ? "💬"
                  : "🔔"}
              </span>
              <div className="flex-1 min-w-0">
                {n.subject && (
                  <p className="font-semibold text-sm mb-0.5">{n.subject}</p>
                )}
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {n.body}
                </p>
                <p className="text-xs text-gray-400 mt-1.5">
                  {new Date(n.createdAt).toLocaleString("en-UG")}
                </p>
              </div>
              {!n.readAt && (
                <span
                  className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5"
                  aria-label="Unread"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
