"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: string;
  subject: string | null;
  body: string;
  readAt: string | null;
  createdAt: string;
  channel: string;
  metadata: Record<string, unknown> | null;
}

export const dynamic = "force-dynamic";

/** Map notification type to emoji and category label */
const TYPE_META: Record<string, { icon: string; category: string; label: string }> = {
  NEW_MESSAGE:              { icon: "✉️",  category: "messages",    label: "Messages" },
  DIRECT_MESSAGE:           { icon: "✉️",  category: "messages",    label: "Messages" },
  CLASS_REMINDER:           { icon: "📹",  category: "classes",     label: "Classes" },
  LIVE_CLASS_STARTED:       { icon: "📹",  category: "classes",     label: "Classes" },
  CLASS_CANCELLED:          { icon: "🚫",  category: "classes",     label: "Classes" },
  EXAM_RESULT:              { icon: "📋",  category: "exams",       label: "Exams" },
  EXAM_AVAILABLE:           { icon: "✏️",  category: "exams",       label: "Exams" },
  EXAM_REVIEW:              { icon: "✏️",  category: "exams",       label: "Exams" },
  ASSIGNMENT_DUE:           { icon: "📝",  category: "assignments", label: "Assignments" },
  ASSIGNMENT_GRADED:        { icon: "✅",  category: "assignments", label: "Assignments" },
  PAYMENT_RECEIPT:          { icon: "💳",  category: "payments",    label: "Payments" },
  PAYMENT_REMINDER:         { icon: "💳",  category: "payments",    label: "Payments" },
  PAYMENT_CLAIM_SUBMITTED:  { icon: "📨",  category: "payments",    label: "Payments" },
  PAYMENT_HOLD:             { icon: "🔒",  category: "payments",    label: "Payments" },
  ANNOUNCEMENT:             { icon: "📢",  category: "announcements","label": "Announcements" },
  COURSE_ANNOUNCEMENT:      { icon: "📢",  category: "announcements","label": "Announcements" },
  SUPPORT_TICKET_CREATED:   { icon: "🎫",  category: "system",      label: "System" },
  SUPPORT_TICKET_REPLY:     { icon: "💬",  category: "system",      label: "System" },
  WELCOME:                  { icon: "👋",  category: "system",      label: "System" },
  CERTIFICATE_READY:        { icon: "🎓",  category: "system",      label: "System" },
};

const ALL_CATEGORIES = [
  { key: "all",          label: "All" },
  { key: "messages",     label: "Messages" },
  { key: "classes",      label: "Classes" },
  { key: "exams",        label: "Exams" },
  { key: "assignments",  label: "Assignments" },
  { key: "payments",     label: "Payments" },
  { key: "announcements",label: "Announcements" },
  { key: "system",       label: "System" },
];

/** Map notification type + metadata to the most relevant page URL */
function notificationHref(n: Notification): string | null {
  const meta = n.metadata ?? {};
  switch (n.type) {
    case "NEW_MESSAGE":
    case "DIRECT_MESSAGE":
      return "/dashboard/messages";
    case "CLASS_REMINDER":
    case "LIVE_CLASS_STARTED":
    case "CLASS_CANCELLED":
      return "/dashboard/classes";
    case "EXAM_RESULT":
    case "EXAM_AVAILABLE":
    case "EXAM_REVIEW":
      return typeof meta.examId === "string" ? `/dashboard/exams/${meta.examId}` : "/dashboard/exams";
    case "ASSIGNMENT_DUE":
    case "ASSIGNMENT_GRADED":
      return "/dashboard/assignments";
    case "PAYMENT_RECEIPT":
    case "PAYMENT_REMINDER":
    case "PAYMENT_CLAIM_SUBMITTED":
    case "PAYMENT_HOLD":
      return "/dashboard/payments";
    case "ANNOUNCEMENT":
    case "COURSE_ANNOUNCEMENT":
      return "/dashboard/announcements";
    case "SUPPORT_TICKET_REPLY":
    case "SUPPORT_TICKET_CREATED":
      return typeof meta.ticketId === "string"
        ? `/dashboard/support/${meta.ticketId}`
        : "/dashboard/support";
    case "CERTIFICATE_READY":
      return "/dashboard/certificates";
    default:
      return null;
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");

  const load = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => { setNotifications(data.notifications ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n)
    );
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    await fetch("/api/notifications/mark-all-read", { method: "POST" }).catch(() => {});
  }

  function handleClick(n: Notification) {
    if (!n.readAt) void markRead(n.id);
    const href = notificationHref(n);
    if (href) router.push(href);
  }

  const unread = notifications.filter((n) => !n.readAt);

  const filtered = notifications.filter((n) => {
    if (category === "all") return true;
    const meta = TYPE_META[n.type];
    return meta ? meta.category === category : category === "system";
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">
            {unread.length > 0 ? `${unread.length} unread` : "All caught up"}
          </p>
        </div>
        {unread.length > 0 && (
          <button
            onClick={markAllRead}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {ALL_CATEGORIES.map((cat) => {
          const catCount = cat.key === "all"
            ? unread.length
            : unread.filter((n) => {
                const meta = TYPE_META[n.type];
                return meta ? meta.category === cat.key : cat.key === "system";
              }).length;
          return (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                category === cat.key
                  ? "bg-primary text-white"
                  : "bg-surface text-gray-600 hover:bg-primary/10"
              }`}
            >
              {cat.label}
              {catCount > 0 && (
                <span className="ml-1.5 bg-danger text-white rounded-full px-1.5 py-0.5 text-xs leading-none">
                  {catCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
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

      {!loading && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell className="w-7 h-7 text-primary/40" />
          </div>
          <h2 className="font-bold text-primary mb-2">No notifications</h2>
          <p className="text-gray-500 text-sm">
            {category === "all" ? "You're all caught up!" : `No ${category} notifications.`}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((n) => {
            const meta = TYPE_META[n.type];
            const icon = meta?.icon ?? "🔔";
            const href = notificationHref(n);
            const isUnread = !n.readAt;

            return (
              <div
                key={n.id}
                role={href ? "button" : undefined}
                tabIndex={href ? 0 : undefined}
                onClick={() => handleClick(n)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClick(n); }}
                className={`bg-white rounded-2xl border p-5 transition-colors ${
                  href ? "cursor-pointer hover:shadow-md" : ""
                } ${isUnread ? "border-accent/30" : "border-border"}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                    isUnread ? "bg-accent/10" : "bg-surface"
                  }`}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    {n.subject && (
                      <p className={`text-sm font-semibold mb-0.5 ${isUnread ? "text-primary" : "text-gray-700"}`}>
                        {n.subject}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{n.body}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs text-gray-400">
                        {new Date(n.createdAt).toLocaleString("en-UG", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                      {meta?.label && (
                        <span className="text-xs bg-surface text-gray-500 px-2 py-0.5 rounded-full">
                          {meta.label}
                        </span>
                      )}
                      {href && (
                        <span className="text-xs text-accent font-medium">View &rarr;</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {isUnread && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void markRead(n.id); }}
                        className="text-xs text-accent hover:underline"
                        aria-label="Mark as read"
                      >
                        Mark read
                      </button>
                    )}
                    {!isUnread && <CheckCircle2 className="w-4 h-4 text-gray-200" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
