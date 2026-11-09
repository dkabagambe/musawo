"use client";

import { useState, useEffect } from "react";
import { Megaphone } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  authorName?: string;
}

export const dynamic = "force-dynamic";

export default function SystemAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((data) => { setItems(data.announcements ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="portal-page-header">
        <h1 className="portal-page-title">Announcements</h1>
        <p className="portal-page-subtitle">
          Institution-wide announcements from the Director and Principal.
        </p>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading...</p>}

      {!loading && items.length === 0 && (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-7 h-7 text-primary/40" />
          </div>
          <h2 className="font-bold text-primary mb-2">No announcements</h2>
          <p className="text-gray-500 text-sm">There are no announcements yet.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="card">
              <div className="flex justify-between gap-3">
                <h3 className="font-semibold">
                  {item.pinned ? "\u{1F4CC} " : ""}
                  {item.title}
                </h3>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(item.createdAt).toLocaleDateString("en-UG")}
                </span>
              </div>
              {item.authorName && (
                <p className="text-xs text-accent mt-1">By {item.authorName}</p>
              )}
              <p className="whitespace-pre-wrap text-sm text-gray-600 mt-3">{item.body}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
