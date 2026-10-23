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
  recordingUrl: string | null;
  studentsMaySpeak?: boolean;
  recordingStatus?: string;
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
  const [canManageClasses, setCanManageClasses] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    courseId: "", blockId: "", title: "", description: "",
    scheduledAt: "", durationMin: "60", joinUrl: "", platform: "link", selfCheckIn: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [classMessage, setClassMessage] = useState("");
  const [recordingUrls, setRecordingUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/tutor/classes").then((r) => r.json()),
      fetch("/api/tutor/courses").then((r) => r.json()),
    ]).then(([classData, courseData]) => {
      setClasses(classData.classes ?? []);
      setCourses(courseData.courses ?? []);
      setCanManageClasses(Boolean(courseData.canManageClasses));
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
          joinUrl: form.joinUrl || undefined,
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
      setForm({ courseId: "", blockId: "", title: "", description: "", scheduledAt: "", durationMin: "60", joinUrl: "", platform: "link", selfCheckIn: false });
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const upcoming = classes.filter((c) => new Date(c.scheduledAt) > new Date() || c.status === "LIVE");
  const past = classes.filter((c) => new Date(c.scheduledAt) <= new Date() && c.status !== "LIVE");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">Live Classes</h1>
        {canManageClasses && <button onClick={() => setShowForm((v) => !v)} className="btn-primary text-sm">
          {showForm ? "Cancel" : "+ New class"}
        </button>}
      </div>
      {classMessage && <p role="status" className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{classMessage}</p>}

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
                <option value="link">Meet, Zoom or another link</option>
                <option value="bbb">BigBlueButton</option>
                <option value="jitsi">Jitsi</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="joinUrl">Join URL</label>
              <input id="joinUrl" type="url" required={form.platform === "link"} disabled={form.platform !== "link"} value={form.joinUrl} onChange={(e) => setForm((f) => ({ ...f, joinUrl: e.target.value }))} className="input disabled:bg-gray-100" placeholder="https://meet.google.com/…" />
              <p className="mt-1 text-xs text-gray-400">BigBlueButton requires IT configuration. Jitsi remains disabled unless IT enables it.</p>
            </div>
            <label className="sm:col-span-2 flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={form.selfCheckIn} onChange={(event) => setForm((f) => ({ ...f, selfCheckIn: event.target.checked }))} />Allow self check-in from 15 minutes before class until 30 minutes after start</label>
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
                    <a href={`/tutor/attendance`} className="btn-outline text-xs no-underline">Roll call</a>
                    {canManageClasses && <button type="button" className="btn-outline text-xs" onClick={async () => {
                      const action = cls.status === "LIVE" ? "stop" : "start";
                      const response = await fetch("/api/tutor/classes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classId: cls.id, action }) });
                      if (response.ok) { const result = await response.json(); setClasses((rows) => rows.map((row) => row.id === cls.id ? { ...row, status: result.status, joinUrl: result.joinUrl ?? row.joinUrl } : row)); if (result.externalRoomMustBeEnded) setClassMessage("The platform has closed admission. End the room in Meet, Zoom or the external provider to close the meeting for existing guests."); if (result.recordingPending) setClassMessage("Recording pending. Add a replay link after the provider finishes processing it."); }
                    }}>{cls.status === "LIVE" ? "Stop class" : "Start class"}</button>}
                    {canManageClasses && cls.status === "LIVE" && <button type="button" className="btn-outline text-xs" onClick={async () => {
                      const allow = !cls.studentsMaySpeak;
                      const response = await fetch("/api/tutor/classes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classId: cls.id, action: "students_may_speak", studentsMaySpeak: allow }) });
                      if (response.ok) setClasses((rows) => rows.map((row) => row.id === cls.id ? { ...row, studentsMaySpeak: allow } : row));
                    }}>{cls.studentsMaySpeak ? "Students may speak" : "Students muted"}</button>}
                    {cls.status === "LIVE" && <a href={cls.joinUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs px-4 py-1.5 no-underline">Open room</a>}
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
                  <div key={cls.id} className="card flex flex-wrap items-center gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{cls.title}</p>
                      <p className="text-xs text-gray-400">{cls.course.title} · {new Date(cls.scheduledAt).toLocaleDateString("en-UG")}</p>
                    </div>
                    <a href={`/api/tutor/attendance/export?classId=${cls.id}&format=csv`} className="btn-outline text-xs no-underline" download>Attendance CSV</a>
                    <a href={`/api/tutor/attendance/export?classId=${cls.id}&format=pdf`} className="btn-outline text-xs no-underline" download>Attendance PDF</a>
                    {canManageClasses && !cls.recordingUrl && <div className="flex flex-1 gap-2 min-w-64"><input aria-label="Class replay link" className="input !py-1.5 text-xs" type="url" placeholder="Replay link, if available" value={recordingUrls[cls.id] ?? ""} onChange={(event) => setRecordingUrls((value) => ({ ...value, [cls.id]: event.target.value }))} /><button type="button" className="btn-outline text-xs" onClick={async () => { const response = await fetch("/api/tutor/classes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classId: cls.id, action: "recording", recordingUrl: recordingUrls[cls.id] }) }); if (response.ok) { setClasses((rows) => rows.map((row) => row.id === cls.id ? { ...row, recordingUrl: recordingUrls[cls.id] } : row)); setClassMessage("Replay saved for enrolled students."); } }}>Save replay</button><span className="text-xs text-amber-700">Recording pending</span></div>}
                    {cls.recordingUrl && <a href={cls.recordingUrl} target="_blank" rel="noopener noreferrer" className="btn-outline text-xs">Replay saved</a>}
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
