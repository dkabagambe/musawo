"use client";

import { useState, useEffect } from "react";

interface LiveClass {
  id: string;
  title: string;
  scheduledAt: string;
  durationMin: number;
  joinUrl: string;
  platform: string;
  status: string;
  course: { title: string };
}

interface Course {
  id: string;
  title: string;
  blocks: { id: string; title: string; order: number }[];
}

export default function TutorClassesPage() {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    courseId: "", blockId: "", title: "", description: "",
    scheduledAt: "", durationMin: "60", joinUrl: "", platform: "google_meet",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/tutor/classes").then((r) => r.json()),
      fetch("/api/tutor/courses").then((r) => r.json()),
    ]).then(([classData, courseData]) => {
      setClasses(classData.classes ?? []);
      setCourses(courseData.courses ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const selectedCourse = courses.find((c) => c.id === form.courseId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/tutor/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          durationMin: Number(form.durationMin),
          blockId: form.blockId || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to create class.");
        return;
      }
      const newClass = await res.json();
      setClasses((prev) => [newClass, ...prev]);
      setShowForm(false);
      setForm({ courseId: "", blockId: "", title: "", description: "", scheduledAt: "", durationMin: "60", joinUrl: "", platform: "google_meet" });
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const upcoming = classes.filter((c) => new Date(c.scheduledAt) > new Date());
  const past = classes.filter((c) => new Date(c.scheduledAt) <= new Date());

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">Live Classes</h1>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary text-sm">
          {showForm ? "Cancel" : "+ New class"}
        </button>
      </div>

      {showForm && (
        <div className="card mb-8">
          <h2 className="font-semibold mb-4">Schedule a new class</h2>
          {error && <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="courseId">Course</label>
              <select id="courseId" value={form.courseId} onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value, blockId: "" }))} className="input" required>
                <option value="">Select course…</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="blockId">Block (optional)</label>
              <select id="blockId" value={form.blockId} onChange={(e) => setForm((f) => ({ ...f, blockId: e.target.value }))} className="input">
                <option value="">No specific block</option>
                {selectedCourse?.blocks.map((b) => <option key={b.id} value={b.id}>Block {b.order}: {b.title}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="title">Title</label>
              <input id="title" type="text" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input" placeholder="Week 1 Introduction" />
            </div>
            <div>
              <label className="label" htmlFor="scheduledAt">Date & Time</label>
              <input id="scheduledAt" type="datetime-local" required value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="durationMin">Duration (minutes)</label>
              <input id="durationMin" type="number" min="15" max="240" value={form.durationMin} onChange={(e) => setForm((f) => ({ ...f, durationMin: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="platform">Platform</label>
              <select id="platform" value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))} className="input">
                <option value="google_meet">Google Meet</option>
                <option value="zoom">Zoom</option>
                <option value="jitsi">Jitsi</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="joinUrl">Join URL</label>
              <input id="joinUrl" type="url" required value={form.joinUrl} onChange={(e) => setForm((f) => ({ ...f, joinUrl: e.target.value }))} className="input" placeholder="https://meet.google.com/…" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Scheduling…" : "Schedule class"}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <p className="text-gray-400 text-center py-8">Loading…</p> : (
        <>
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Upcoming ({upcoming.length})</h2>
            {upcoming.length === 0 ? <p className="text-gray-400 text-sm">No upcoming classes.</p> : (
              <div className="space-y-3">
                {upcoming.map((cls) => (
                  <div key={cls.id} className="card flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{cls.title}</p>
                      <p className="text-xs text-gray-400">{cls.course.title} · {new Date(cls.scheduledAt).toLocaleString("en-UG")} · {cls.durationMin} min</p>
                    </div>
                    <a href={cls.joinUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs px-4 py-1.5 no-underline">Join</a>
                  </div>
                ))}
              </div>
            )}
          </section>
          {past.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Past classes</h2>
              <div className="space-y-2">
                {past.slice(0, 10).map((cls) => (
                  <div key={cls.id} className="card flex items-center gap-3 opacity-70 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{cls.title}</p>
                      <p className="text-xs text-gray-400">{cls.course.title} · {new Date(cls.scheduledAt).toLocaleDateString("en-UG")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
