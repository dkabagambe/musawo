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
  metadata: Record<string, unknown> | null;
}

/**
 * Shared inbox showing direct messages received by the current user.
 * Fetches from /api/notifications and filters for type=DIRECT_MESSAGE.
 */
export default function MessageInbox() {
  const [messages, setMessages] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        const all: Notification[] = data.notifications ?? [];
        setMessages(all.filter((n) => n.type === "DIRECT_MESSAGE"));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-4 bg-surface rounded w-1/3 mb-2" />
            <div className="h-3 bg-surface rounded w-full mb-1" />
            <div className="h-3 bg-surface rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <p className="text-sm text-gray-500">No messages received yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((m) => {
        const fromName = (m.metadata as Record<string, unknown> | null)?.fromName as string | undefined;
        return (
          <article key={m.id} className={`card ${!m.readAt ? "border-accent/30 bg-accent/5" : ""}`}>
            <div className="flex justify-between gap-3">
              <h3 className="font-semibold">{m.subject ?? "(no subject)"}</h3>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {new Date(m.createdAt).toLocaleString("en-UG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {fromName && (
              <p className="text-xs text-accent mt-1">From: {fromName}</p>
            )}
            <p className="whitespace-pre-wrap text-sm text-gray-600 mt-3">{m.body}</p>
            {!m.readAt && (
              <span className="inline-block mt-2 text-xs font-semibold text-accent">New</span>
            )}
          </article>
        );
      })}
    </div>
  );
}
