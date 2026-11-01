"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props { courses: { id: string; title: string }[] }

export default function NewForumThreadForm({ courses }: Props) {
  const router = useRouter();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !courseId) { setErr("Please fill all fields."); return; }
    setErr(""); setSaving(true);
    try {
      const res = await fetch("/api/forum/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, title: title.trim(), body: body.trim() }),
      });
      if (!res.ok) { const d = await res.json(); setErr(d.error ?? "Failed to create thread."); }
      else { router.push("/tutor/forum"); }
    } catch { setErr("Network error."); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <label className="label">Course</label>
        <select className="select" value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Thread title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Questions about Module 2" required maxLength={200} />
      </div>
      <div>
        <label className="label">Body</label>
        <textarea
          className="input min-h-[120px] resize-y"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Start the conversation..."
          required
        />
      </div>
      {err && <p className="text-sm text-danger font-medium">{err}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-secondary text-sm">
          {saving ? "Posting..." : "Post thread"}
        </button>
        <a href="/tutor/forum" className="btn-ghost text-sm no-underline">Cancel</a>
      </div>
    </form>
  );
}
