"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

interface Course {
  id: string;
  title: string;
}

function NewThreadForm() {
  const router = useRouter();
  const sp = useSearchParams();

  // Optional context from URL (from GroupPanel / MyGroupCard links)
  const classId = sp.get("classId") ?? undefined;
  const groupId = sp.get("groupId") ?? undefined;
  const urlCourseId = sp.get("courseId") ?? undefined;

  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState({ courseId: urlCourseId ?? "", title: "", body: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Derive back link
  const backHref = classId
    ? `/dashboard/forum?classId=${classId}${groupId ? `&groupId=${groupId}` : ""}${urlCourseId ? `&courseId=${urlCourseId}` : ""}`
    : "/dashboard/forum";

  // Scope label
  const scopeLabel = groupId ? "group discussion" : classId ? "class discussion" : "discussion";

  useEffect(() => {
    fetch("/api/forum/courses")
      .then((r) => r.json())
      .then((d) => {
        setCourses(d.courses ?? []);
        // Auto-select course if provided via URL
        if (urlCourseId) {
          setForm((f) => ({ ...f, courseId: urlCourseId }));
        } else if (d.courses?.length === 1) {
          setForm((f) => ({ ...f, courseId: d.courses[0].id }));
        }
      })
      .catch(() => {});
  }, [urlCourseId]);

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
        body: JSON.stringify({
          courseId: form.courseId,
          liveClassId: classId ?? null,
          groupId: groupId ?? null,
          title: form.title,
          body: form.body,
        }),
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
        <Link href={backHref} className="btn-ghost text-sm no-underline px-2 py-1">
          &larr; Back
        </Link>
        <h1 className="text-2xl">Start a {scopeLabel}</h1>
      </div>

      {/* Context badge */}
      {(classId || groupId) && (
        <div className="mb-4 px-3 py-2 bg-accent/10 rounded-xl text-sm text-accent font-medium">
          {groupId ? "Posting to group thread" : "Posting to class thread"}
        </div>
      )}

      <div className="card">
        {error && (
          <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Only show course selector when not scoped to a class */}
          {!classId && (
            <div className="mb-4">
              <label htmlFor="courseId" className="label">Course</label>
              <select
                id="courseId"
                value={form.courseId}
                onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))}
                className="input"
                required
              >
                <option value="">Select a course...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          )}

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
              placeholder="Describe your question or topic..."
            />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Posting..." : "Post discussion"}
            </button>
            <Link href={backHref} className="btn-outline no-underline">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewThreadPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <NewThreadForm />
    </Suspense>
  );
}
