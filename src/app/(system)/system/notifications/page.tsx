"use client";

import { useState, useEffect } from "react";
import { Bell, Mail, MessageCircle, CheckCircle2 } from "lucide-react";

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

export default function SystemNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => { setNotifications(data.notifications ?? []); setLoading(false); })
      .catch(() => setLoading(false));
    fetch("/api/notifications/mark-read", { method: "POST" }).catch(() => {});
  }, []);

  const unread = notifications.filter((n) => !n.readAt);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Notifications</h1>
        <p className="text-gray-500 text-sm mt-1">
          {unread.length > 0 ? `${unread.length} unread` : "All caught up"}
        </p>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading...</p>}

      {!loading && notifications.length === 0 && (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell className="w-7 h-7 text-primary/40" />
          </div>
          <h2 className="font-bold text-primary mb-2">No notifications</h2>
          <p className="text-gray-500 text-sm">You are all caught up!</p>
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className={`bg-white rounded-2xl border p-5 ${!n.readAt ? "border-accent/30 bg-accent/3" : "border-border"}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${!n.readAt ? "bg-accent/10" : "bg-surface"}`}>
                  {n.type === "DIRECT_MESSAGE" ? "✉️" : n.type === "ANNOUNCEMENT" ? "📢" : "🔔"}
                </div>
                <div className="flex-1 min-w-0">
                  {n.subject && <p className={`text-sm font-semibold mb-0.5 ${!n.readAt ? "text-primary" : "text-gray-700"}`}>{n.subject}</p>}
                  <p className="text-sm text-gray-600 leading-relaxed">{n.body}</p>
                  <span className="text-xs text-gray-400">
                    {new Date(n.createdAt).toLocaleString("en-UG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {n.readAt && <CheckCircle2 className="w-4 h-4 text-gray-200 flex-shrink-0 mt-0.5" />}
                {!n.readAt && <span className="w-2 h-2 bg-accent rounded-full flex-shrink-0 mt-1.5" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
