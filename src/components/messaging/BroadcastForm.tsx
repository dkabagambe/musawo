"use client";

import { useState, useEffect } from "react";
import { Send } from "lucide-react";

interface Course { id: string; title: string; }

interface Props {
  onSent?: () => void;
}

/**
 * Tutor broadcast form: send a message to all students in a course.
 * Fetches the tutor's own courses to populate the target selector.
 */
export default function BroadcastForm({ onSent }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [targetId, setTargetId] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/tutor/courses")
      .then((r) => r.json())
      .then((d) => setCourses(d.courses ?? []))
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetId || !body.trim()) return;
    setSending(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/conversations/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "course", targetId, body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send broadcast.");
        return;
      }
      setSuccess(`Broadcast sent to ${data.sent} student${data.sent !== 1 ? "s" : ""}.`);
      setBody("");
      setTargetId("");
      onSent?.();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="card space-y-4 border-primary/20 bg-primary/5"
    >
      <h3 className="font-semibold text-primary text-sm">Message a whole class or course</h3>
      <p className="text-xs text-gray-500">
        Your message will be sent as an individual conversation to each student. Replies come back to you privately.
      </p>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}

      <label className="block">
        <span className="label">Target course</span>
        <select
          className="input"
          required
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        >
          <option value="">Select a course...</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="label">Message (max 2000 characters)</span>
        <textarea
          className="input min-h-24 resize-none"
          required
          minLength={1}
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type your message to all students in this course..."
        />
        <span className="text-xs text-gray-400">{body.length}/2000</span>
      </label>

      <button
        type="submit"
        disabled={sending || !targetId || !body.trim()}
        className="btn-primary flex items-center gap-2"
      >
        <Send className="w-4 h-4" />
        {sending ? "Sending..." : "Send to all students"}
      </button>
    </form>
  );
}
