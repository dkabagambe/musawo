"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
}

export default function NewThreadPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState({ courseId: "", title: "", body: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/forum/courses")
      .then((r) => r.json())
      .then((d) => setCourses(d.courses ?? []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.courseId) { setError("Please select a course."); return; }
    if (!form.title.trim()) { setError("Please enter a title."); return; }
    if (!form.body.trim()) { setError("Please enter your message."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/forum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to post.");
        return;
      }
      const d = await res.json();
      router.push(`/dashboard/forum/${d.id}`);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/forum" className="btn-ghost text-sm no-underline px-2 py-1">
          ← Back
        </Link>
        <h1 className="text-2xl">Start a discussion</h1>
      </div>

      <div className="card">
        {error && (
          <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="courseId" className="label">Course</label>
            <select
              id="courseId"
              value={form.courseId}
              onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))}
              className="input"
              required
            >
              <option value="">Select a course…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="title" className="label">Title</label>
            <input
              id="title"
              type="text"
              maxLength={200}
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="input"
              placeholder="What would you like to discuss?"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="body" className="label">Message</label>
            <textarea
              id="body"
              rows={6}
              required
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className="input resize-y"
              placeholder="Describe your question or topic…"
            />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Posting…" : "Post discussion"}
            </button>
            <Link href="/dashboard/forum" className="btn-outline no-underline">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
