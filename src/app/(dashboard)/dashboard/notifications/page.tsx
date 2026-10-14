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

const TYPE_ICON: Record<string, string> = {
  EXAM_RESULT: "📋", CLASS_REMINDER: "📹", PAYMENT_REMINDER: "💳",
  WELCOME: "👋", CERTIFICATE_READY: "🎓", CLAIM_SUBMITTED: "📨",
  APPROVAL_NEEDED: "📋", EXAM_REVIEW: "✏️",
};

export default function NotificationsPage() {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">
            {unread.length > 0 ? `${unread.length} unread` : "All caught up"}
          </p>
        </div>
        {unread.length > 0 && (
          <span className="bg-danger text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {unread.length} new
          </span>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-border p-5 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-surface rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-surface rounded w-2/3" />
                  <div className="h-3 bg-surface rounded w-full" />
                  <div className="h-2 bg-surface rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell className="w-7 h-7 text-primary/40" />
          </div>
          <h2 className="font-bold text-primary mb-2">No notifications</h2>
          <p className="text-gray-500 text-sm">You're all caught up!</p>
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((n) => {
            const icon = TYPE_ICON[n.type] ?? "🔔";
            const channelIcon = n.channel === "EMAIL" ? <Mail className="w-3 h-3" /> :
                                n.channel === "SMS"   ? <MessageCircle className="w-3 h-3" /> :
                                                        <Bell className="w-3 h-3" />;
            return (
              <div key={n.id} className={`bg-white rounded-2xl border p-5 transition-colors
                ${!n.readAt ? "border-accent/30 bg-accent/3" : "border-border"}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0
                    ${!n.readAt ? "bg-accent/10" : "bg-surface"}`}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    {n.subject && (
                      <p className={`text-sm font-semibold mb-0.5 ${!n.readAt ? "text-primary" : "text-gray-700"}`}>
                        {n.subject}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 leading-relaxed">{n.body}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400">
                        {new Date(n.createdAt).toLocaleString("en-UG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="text-gray-300 flex items-center gap-0.5 text-xs">{channelIcon}</span>
                    </div>
                  </div>
                  {n.readAt && <CheckCircle2 className="w-4 h-4 text-gray-200 flex-shrink-0 mt-0.5" />}
                  {!n.readAt && <span className="w-2 h-2 bg-accent rounded-full flex-shrink-0 mt-1.5" aria-label="Unread" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
