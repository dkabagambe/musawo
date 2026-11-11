"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface Course { id: string; title: string }

export default function CreateAssignmentForm({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [form, setForm] = useState({
    courseId: courses[0]?.id ?? "",
    title: "",
    body: "",
    dueDate: "",
    maxPoints: 100,
    status: "PUBLISHED" as "DRAFT" | "PUBLISHED",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.courseId || !form.title.trim() || !form.body.trim()) {
      setError("Course, title, and description are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/tutor/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: form.courseId,
          title: form.title.trim(),
          body: form.body.trim(),
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
          maxPoints: form.maxPoints,
          status: form.status,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to create assignment."); return; }
      setOpen(false);
      setForm({ courseId: courses[0]?.id ?? "", title: "", body: "", dueDate: "", maxPoints: 100, status: "PUBLISHED" });
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-sm font-semibold text-primary"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create new assignment
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <p className="text-sm text-danger bg-danger/10 rounded-xl px-4 py-3">{error}</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="a-course" className="label">Course *</label>
              <select
                id="a-course"
                className="input"
                value={form.courseId}
                onChange={(e) => set("courseId", e.target.value)}
                required
              >
                <option value="">Select a course...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="a-title" className="label">Title *</label>
              <input
                id="a-title"
                type="text"
                className="input"
                placeholder="e.g. Week 3 Reflection"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                required
                maxLength={300}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="a-body" className="label">Instructions *</label>
              <textarea
                id="a-body"
                className="input min-h-[120px] resize-y"
                placeholder="Describe what students must do, any references to use, word count, etc."
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
                required
                maxLength={10000}
              />
            </div>
            <div>
              <label htmlFor="a-due" className="label">Due date (optional)</label>
              <input
                id="a-due"
                type="datetime-local"
                className="input"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="a-max" className="label">Max points</label>
              <input
                id="a-max"
                type="number"
                className="input"
                min={1}
                max={100}
                value={form.maxPoints}
                onChange={(e) => set("maxPoints", parseInt(e.target.value, 10) || 100)}
              />
            </div>
            <div>
              <label htmlFor="a-status" className="label">Status</label>
              <select
                id="a-status"
                className="input"
                value={form.status}
                onChange={(e) => set("status", e.target.value as "DRAFT" | "PUBLISHED")}
              >
                <option value="PUBLISHED">Published (students can see and submit)</option>
                <option value="DRAFT">Draft (not visible to students)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create assignment"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => { setOpen(false); setError(""); }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
