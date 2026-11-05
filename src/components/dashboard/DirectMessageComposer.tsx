"use client";

import { useState } from "react";

type Recipient = {
  id: string;
  name: string;
  role: string;
};

type SentMessage = {
  id: string;
  recipientName: string;
  subject: string;
  body: string;
  createdAt: string;
};

/**
 * Client component for Director / Principal to send a direct message
 * (notification) to a specific staff member or student.
 */
export default function DirectMessageComposer({
  recipients,
  sentMessages,
}: {
  recipients: Recipient[];
  sentMessages: SentMessage[];
}) {
  const [items, setItems] = useState(sentMessages);
  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const filtered = recipients.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, subject, body }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not send message.");
        return;
      }
      setItems((rows) => [
        {
          id: data.notification?.id ?? Date.now().toString(),
          recipientName: data.recipientName,
          subject,
          body,
          createdAt: new Date().toISOString(),
        },
        ...rows,
      ]);
      setRecipientId("");
      setSubject("");
      setBody("");
      setSearch("");
      setSuccess(`Message sent to ${data.recipientName}.`);
    } catch {
      setError("Could not send message.");
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
          <span className="label">Search recipient</span>
          <input
            className="input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a name to search..."
          />
        </label>
        <label className="block">
          <span className="label">Recipient</span>
          <select
            className="input"
            required
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
          >
            <option value="">Select a person...</option>
            {filtered.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.role})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Subject</span>
          <input
            className="input"
            required
            minLength={1}
            maxLength={160}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Message subject"
          />
        </label>
        <label className="block">
          <span className="label">Message</span>
          <textarea
            className="input min-h-32"
            required
            minLength={1}
            maxLength={10000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
          />
        </label>
        <button className="btn-primary" disabled={saving || !recipientId}>
          {saving ? "Sending..." : "Send message"}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Sent messages</h2>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">No messages sent yet.</p>
        ) : (
          items.map((item) => (
            <article key={item.id} className="card">
              <div className="flex justify-between gap-3">
                <h3 className="font-semibold">{item.subject}</h3>
                <span className="text-xs text-gray-400">
                  {new Date(item.createdAt).toLocaleDateString("en-UG")}
                </span>
              </div>
              <p className="text-xs text-accent mt-1">To: {item.recipientName}</p>
              {item.body && (
                <p className="whitespace-pre-wrap text-sm text-gray-600 mt-3">
                  {item.body}
                </p>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
