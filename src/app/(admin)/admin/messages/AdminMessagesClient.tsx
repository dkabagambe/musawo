"use client";

import { useState, useEffect } from "react";
import { Send, Inbox, PenSquare, RefreshCcw } from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string | null;
};

type Message = {
  id: string;
  subject: string | null;
  body: string;
  readAt: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
};

interface Props {
  instructors: User[];
  students: User[];
}

export default function AdminMessagesClient({ instructors, students }: Props) {
  const [tab, setTab] = useState<"inbox" | "compose">("inbox");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Compose form
  const [recipientType, setRecipientType] = useState<"instructor" | "student">("instructor");
  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications");
      if (!response.ok) throw new Error("Could not load messages");
      const data = await response.json();
      const all: Message[] = data.notifications ?? [];
      setMessages(all.filter((n) => n.type === "DIRECT_MESSAGE"));
    } catch {
      setError("Could not load messages");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSending(true);

    try {
      const response = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId,
          subject,
          body,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "Could not send message");
      }

      setSuccess("Message sent successfully");
      setRecipientId("");
      setSubject("");
      setBody("");
      setTimeout(() => {
        setTab("inbox");
        setSuccess("");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  const recipients = recipientType === "instructor" ? instructors : students;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          type="button"
          onClick={() => setTab("inbox")}
          className={`px-4 py-2 font-medium transition-colors ${
            tab === "inbox"
              ? "border-b-2 border-primary text-primary"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Inbox className="inline h-4 w-4 mr-2" />
          Inbox
        </button>
        <button
          type="button"
          onClick={() => setTab("compose")}
          className={`px-4 py-2 font-medium transition-colors ${
            tab === "compose"
              ? "border-b-2 border-primary text-primary"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <PenSquare className="inline h-4 w-4 mr-2" />
          Compose
        </button>
      </div>

      {/* Inbox Tab */}
      {tab === "inbox" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Received Messages</h2>
            <button
              type="button"
              onClick={() => loadMessages()}
              className="btn-secondary inline-flex items-center gap-2 text-sm"
            >
              <RefreshCcw className="h-4 w-4" /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="card p-12 text-center">
              <Inbox className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">No messages received yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => {
                const fromName = (m.metadata?.fromName as string | undefined) ?? "Unknown";
                return (
                  <article
                    key={m.id}
                    className={`card p-5 ${!m.readAt ? "border-l-4 border-l-primary bg-primary/5" : ""}`}
                  >
                    <div className="flex justify-between gap-3 mb-2">
                      <h3 className="font-semibold">{m.subject ?? "(no subject)"}</h3>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(m.createdAt).toLocaleString("en-UG", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">From: {fromName}</p>
                    <p className="whitespace-pre-wrap text-sm text-gray-700">{m.body}</p>
                    {!m.readAt && (
                      <span className="inline-block mt-3 px-2 py-1 text-xs font-semibold text-primary bg-primary/10 rounded">
                        New
                      </span>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Compose Tab */}
      {tab === "compose" && (
        <form onSubmit={handleSend} className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold">Send Message</h2>

          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
              {error}
            </p>
          )}

          {success && (
            <p role="status" className="text-sm text-green-600 bg-green-50 p-3 rounded border border-green-200">
              {success}
            </p>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <label className="label">
              Recipient Type
              <select
                value={recipientType}
                onChange={(e) => {
                  setRecipientType(e.target.value as "instructor" | "student");
                  setRecipientId("");
                }}
                className="input"
              >
                <option value="instructor">Instructor</option>
                <option value="student">Student</option>
              </select>
            </label>

            <label className="label">
              Recipient
              <select
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="input"
                required
              >
                <option value="">Select {recipientType}</option>
                {recipients.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} {user.email ? `(${user.email})` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="label">
            Subject
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input"
              minLength={3}
              maxLength={200}
              required
            />
          </label>

          <label className="label">
            Message
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="input"
              rows={8}
              minLength={10}
              maxLength={2000}
              required
            />
          </label>

          <button
            type="submit"
            disabled={sending}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {sending ? "Sending..." : "Send Message"}
          </button>
        </form>
      )}
    </div>
  );
}
