"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

type Course = { id: string; title: string };
type LiveClassOption = { id: string; title: string; courseId: string };
type Announcement = { id: string; title: string; body: string; course: string; createdAt: string };

interface Props {
  courses: Course[];
  classes: LiveClassOption[];
  initial: Announcement[];
}

export default function AnnouncementComposer({ courses, classes, initial }: Props) {
  const [items, setItems] = useState(initial);
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [classId, setClassId] = useState(""); // empty = whole course
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Filter classes to selected course
  const filteredClasses = classes.filter((c) => c.courseId === courseId);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, liveClassId: classId || undefined, title, body, pinned }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not send announcement."); return; }
      setItems((rows) => [{
        id: data.announcement.id,
        title,
        body,
        course: courses.find((c) => c.id === courseId)?.title ?? "Course",
        createdAt: new Date().toISOString(),
      }, ...rows]);
      setTitle("");
      setBody("");
      setPinned(false);
      setClassId("");
    } catch {
      setError("Could not send announcement.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm("Delete this announcement? Students will no longer see it.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((rows) => rows.filter((r) => r.id !== id));
      }
    } catch {
      // silent
    } finally {
      setDeleting(null);
    }
  }

  return (
    <main className="max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary">Announcements</h1>
        <p className="mt-1 text-sm text-gray-500">Announcements go to enrolled learners as in-app notifications.</p>
      </header>

      <form onSubmit={submit} className="card space-y-4">
        {courses.length === 0 ? (
          <p className="text-sm text-gray-500">You have no assigned courses.</p>
        ) : (
          <>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="ann-course">Course *</label>
                <select
                  id="ann-course"
                  className="input"
                  required
                  value={courseId}
                  onChange={(e) => { setCourseId(e.target.value); setClassId(""); }}
                >
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="ann-class">Target class (optional)</label>
                <select
                  id="ann-class"
                  className="input"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                >
                  <option value="">All students in this course</option>
                  {filteredClasses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {classId
                    ? "Only students in this class will receive the notification."
                    : "All enrolled students will receive the notification."}
                </p>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="ann-title">Title *</label>
              <input
                id="ann-title"
                className="input"
                required
                minLength={3}
                maxLength={160}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="ann-body">Message *</label>
              <textarea
                id="ann-body"
                className="input min-h-32"
                required
                minLength={3}
                maxLength={10000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="rounded" />
              Pin this announcement (shows at the top)
            </label>

            <button
              className="btn-primary"
              disabled={saving || courses.length === 0}
            >
              {saving ? "Sending..." : "Send announcement"}
            </button>
          </>
        )}
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent announcements</h2>
        {items.length === 0 && (
          <p className="text-sm text-gray-400 card py-6 text-center">No announcements yet.</p>
        )}
        {items.map((item) => (
          <article key={item.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{item.title}</h3>
                </div>
                <p className="text-xs text-primary mt-0.5">{item.course}</p>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(item.createdAt).toLocaleDateString("en-UG")}</p>
              </div>
              <button
                type="button"
                onClick={() => deleteAnnouncement(item.id)}
                disabled={deleting === item.id}
                className="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger/10 transition-colors flex-shrink-0"
                aria-label={`Delete announcement: ${item.title}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300 mt-3">{item.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
