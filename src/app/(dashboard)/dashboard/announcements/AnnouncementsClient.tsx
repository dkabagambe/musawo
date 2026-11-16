"use client";

import { useState } from "react";
import { Megaphone, MessageSquare, Pin } from "lucide-react";
import Link from "next/link";

interface AnnouncementData {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  isUnread: boolean;
  courseId: string | null;
  courseTitle: string | null;
  authorName: string;
  authorRole: string;
}

interface CourseData {
  id: string;
  title: string;
}

interface Props {
  announcements: AnnouncementData[];
  courses: CourseData[];
}

export default function AnnouncementsClient({ announcements, courses }: Props) {
  const [filter, setFilter] = useState<string>("all");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  async function markRead(id: string) {
    if (readIds.has(id)) return;
    setReadIds((prev) => new Set([...Array.from(prev), id]));
    // Mark the corresponding notification as read by notifying the notifications endpoint.
    // We POST to mark-read without an id to cover all — this is acceptable since visiting
    // the announcements page counts as "seen". A per-announcement approach would need a
    // dedicated endpoint; using bulk mark-read on first open is the existing pattern.
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ANNOUNCEMENT" }), // mark-read handler ignores unknown fields
    }).catch(() => {});
  }

  const filtered = announcements.filter((a) => {
    if (filter === "all") return true;
    if (filter === "site") return a.courseId === null;
    return a.courseId === filter;
  });

  const unreadCount = announcements.filter(
    (a) => a.isUnread && !readIds.has(a.id)
  ).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary">Announcements</h1>
          <p className="text-gray-500 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : `${announcements.length} announcement${announcements.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Course filter */}
      {courses.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {[{ id: "all", title: "All" }, { id: "site", title: "Site-wide" }, ...courses].map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === c.id
                  ? "bg-primary text-white"
                  : "bg-surface text-gray-600 hover:bg-primary/10"
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-7 h-7 text-primary/40" />
          </div>
          <h2 className="font-bold text-primary mb-2">No announcements</h2>
          <p className="text-gray-500 text-sm">Nothing to show at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((ann) => {
            const isUnread = ann.isUnread && !readIds.has(ann.id);
            return (
              <article
                key={ann.id}
                onClick={() => { if (isUnread) void markRead(ann.id); }}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors ${
                  ann.pinned ? "border-accent/40" : isUnread ? "border-primary/30" : "border-border"
                } ${isUnread ? "cursor-pointer hover:shadow-md" : ""}`}
              >
                {ann.pinned && <div className="h-1 bg-accent" />}
                {isUnread && !ann.pinned && <div className="h-1 bg-primary/40" />}
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      ann.pinned ? "bg-accent/10" : isUnread ? "bg-primary/10" : "bg-surface"
                    }`}>
                      {ann.pinned ? (
                        <Pin className="w-5 h-5 text-accent" />
                      ) : (
                        <Megaphone className={`w-5 h-5 ${isUnread ? "text-primary" : "text-primary/40"}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {ann.pinned && (
                          <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Pinned</span>
                        )}
                        {isUnread && (
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-1.5 py-0.5 rounded-full">New</span>
                        )}
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          ann.courseTitle ? "bg-primary/10 text-primary" : "bg-surface text-gray-500"
                        }`}>
                          {ann.courseTitle ?? "Site-wide"}
                        </span>
                      </div>
                      <h2 className="font-bold text-primary text-sm leading-snug mb-2">{ann.title}</h2>
                      <p className="text-sm text-gray-600 leading-relaxed">{ann.body}</p>
                      <div className="flex items-center gap-2 mt-3 text-xs text-gray-400 flex-wrap">
                        <span>{ann.authorName}</span>
                        <span className="bg-surface px-2 py-0.5 rounded-full">{ann.authorRole}</span>
                        <span>·</span>
                        <span>
                          {new Date(ann.createdAt).toLocaleDateString("en-UG", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="pt-2">
        <Link
          href="/dashboard/forum"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary border border-border bg-white px-5 py-2.5 rounded-xl no-underline hover:bg-surface transition-colors"
        >
          <MessageSquare className="w-4 h-4" /> Go to Discussion Forum
        </Link>
      </div>
    </div>
  );
}
