"use client";

import React from "react";

// ─── NotificationBell ─────────────────────────────────────────────────────────

export interface NotificationBellProps {
  count: number;
}

export function NotificationBell({ count }: NotificationBellProps) {
  return (
    <span className="relative inline-flex items-center" aria-label={`${count} unread notification${count !== 1 ? "s" : ""}`}>
      <span className="text-xl" aria-hidden="true">🔔</span>
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 bg-danger text-white text-xs font-bold rounded-full min-w-[1.1rem] h-[1.1rem] flex items-center justify-center px-0.5 leading-none"
          aria-hidden="true"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );
}

// ─── NotificationItem ─────────────────────────────────────────────────────────

export interface NotificationItemProps {
  id: string;
  type: string;
  subject?: string | null;
  body: string;
  readAt?: string | null;
  createdAt: string;
  onMarkRead?: (id: string) => void;
}

export function NotificationItem({
  id,
  subject,
  body,
  readAt,
  createdAt,
  onMarkRead,
}: NotificationItemProps) {
  const isUnread = !readAt;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors ${
        isUnread ? "bg-accent/5" : "bg-white"
      }`}
    >
      {/* Unread dot */}
      <div className="mt-1.5 flex-shrink-0">
        {isUnread ? (
          <span
            className="block w-2 h-2 rounded-full bg-accent"
            aria-label="Unread"
          />
        ) : (
          <span className="block w-2 h-2 rounded-full bg-transparent" aria-hidden="true" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {subject && (
          <p className="text-sm font-semibold leading-tight mb-0.5">{subject}</p>
        )}
        <p className="text-sm text-gray-600 leading-snug line-clamp-3">{body}</p>
        <p className="text-xs text-gray-400 mt-1">
          {new Date(createdAt).toLocaleDateString("en-UG", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Mark read */}
      {isUnread && onMarkRead && (
        <button
          type="button"
          onClick={() => onMarkRead(id)}
          className="text-xs text-accent hover:underline flex-shrink-0 mt-0.5"
          aria-label="Mark as read"
        >
          Mark read
        </button>
      )}
    </div>
  );
}
