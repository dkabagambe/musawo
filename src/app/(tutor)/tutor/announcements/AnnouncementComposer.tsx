"use client";

import { useState } from "react";

type Course = { id: string; title: string };
type Announcement = { id: string; title: string; body: string; course: string; createdAt: string };

export default function AnnouncementComposer({ courses, initial }: { courses: Course[]; initial: Announcement[] }) {
  const [items, setItems] = useState(initial);
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId, title, body }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error ?? "Could not send announcement."); return; }
      setItems((rows) => [{ id: data.announcement.id, title, body, course: courses.find((course) => course.id === courseId)?.title ?? "Course", createdAt: new Date().toISOString() }, ...rows]);
      setTitle(""); setBody("");
    } catch { setError("Could not send announcement."); }
    finally { setSaving(false); }
  }

  return <main className="max-w-4xl mx-auto space-y-6">
    <header><h1 className="text-2xl font-bold text-primary">Class announcements</h1><p className="mt-1 text-sm text-gray-500">Announcements go to enrolled learners as in-platform notifications.</p></header>
    <form onSubmit={submit} className="card space-y-4">
      {courses.length === 0 ? <p className="text-sm text-gray-500">You have no assigned courses.</p> : <>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <label className="block"><span className="label">Course</span><select className="input" required value={courseId} onChange={(event) => setCourseId(event.target.value)}>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
        <label className="block"><span className="label">Title</span><input className="input" required minLength={3} maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="block"><span className="label">Message</span><textarea className="input min-h-32" required minLength={3} maxLength={10000} value={body} onChange={(event) => setBody(event.target.value)} /></label>
        <button className="btn-primary" disabled={saving || courses.length === 0}>{saving ? "Sending…" : "Send announcement"}</button>
      </>}
    </form>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Recent announcements</h2>{items.map((item) => <article key={item.id} className="card"><div className="flex justify-between gap-3"><h3 className="font-semibold">{item.title}</h3><span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString("en-UG")}</span></div><p className="text-xs text-accent mt-1">{item.course}</p><p className="whitespace-pre-wrap text-sm text-gray-600 mt-3">{item.body}</p></article>)}</section>
  </main>;
}
