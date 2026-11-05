"use client";

import { useState } from "react";

type Announcement = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  authorName?: string;
};

/**
 * Client component for Director / Principal to compose and send
 * institution-wide (site-wide) announcements.  Everyone with an active
 * account receives an in-app notification.
 */
export default function SiteAnnouncementComposer({
  initial,
}: {
  initial: Announcement[];
}) {
  const [items, setItems] = useState(initial);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: null, title, body, pinned }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not send announcement.");
        return;
      }
      setItems((rows) => [
        {
          id: data.announcement.id,
          title,
          body,
          pinned,
          createdAt: new Date().toISOString(),
        },
        ...rows,
      ]);
      setTitle("");
      setBody("");
      setPinned(false);
      setSuccess(`Announcement sent to ${data.recipientCount ?? "all"} active users.`);
    } catch {
      setError("Could not send announcement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="card space-y-4">
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {success && <p className="text-sm text-success">{success}</p>}
        <label className="block">
          <span className="label">Title</span>
          <input
            className="input"
            required
            minLength={3}
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement title"
          />
        </label>
        <label className="block">
          <span className="label">Message</span>
          <textarea
            className="input min-h-32"
            required
            minLength={3}
            maxLength={10000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your announcement..."
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
          />
          Pin this announcement to the top
        </label>
        <button className="btn-primary" disabled={saving}>
          {saving ? "Sending..." : "Send to everyone"}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent announcements</h2>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">No announcements yet.</p>
        ) : (
          items.map((item) => (
            <article key={item.id} className="card">
              <div className="flex justify-between gap-3">
                <h3 className="font-semibold">
                  {item.pinned ? "\u{1F4CC} " : ""}
                  {item.title}
                </h3>
                <span className="text-xs text-gray-400">
                  {new Date(item.createdAt).toLocaleDateString("en-UG")}
                </span>
              </div>
              {item.authorName && (
                <p className="text-xs text-accent mt-1">By {item.authorName}</p>
              )}
              <p className="whitespace-pre-wrap text-sm text-gray-600 mt-3">
                {item.body}
              </p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
