"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { TimetableClass } from "./TimetableView";

interface CourseOption {
  id: string;
  title: string;
  courseCode: string | null;
}

interface Block {
  id: string;
  title: string;
  order: number;
}

interface CourseWithBlocks extends CourseOption {
  blocks?: Block[];
}

interface Props {
  courses: CourseOption[];
  onClose: () => void;
  onCreated: (created: TimetableClass[]) => void;
}

export default function CreateClassModal({ courses, onClose, onCreated }: Props) {
  const [courseBlocks, setCourseBlocks] = useState<Block[]>([]);
  const [form, setForm] = useState({
    courseId: "",
    blockId: "",
    title: "",
    description: "",
    scheduledAt: "",
    durationMin: "60",
    joinUrl: "",
    platform: "link",
    venue: "",
    selfCheckIn: false,
    repeatWeeklyUntil: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadBlocks(courseId: string) {
    if (!courseId) return;
    try {
      const r = await fetch(`/api/tutor/courses`);
      if (!r.ok) return;
      const d = await r.json();
      const c = (d.courses as CourseWithBlocks[]).find((x) => x.id === courseId);
      setCourseBlocks(c?.blocks ?? []);
    } catch {
      // non-critical
    }
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/tutor/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: form.courseId,
          blockId: form.blockId || undefined,
          title: form.title,
          description: form.description || undefined,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
          durationMin: Number(form.durationMin),
          joinUrl: form.joinUrl || undefined,
          platform: form.platform,
          venue: form.venue || undefined,
          selfCheckIn: form.selfCheckIn,
          repeatWeeklyUntil: form.repeatWeeklyUntil
            ? new Date(form.repeatWeeklyUntil).toISOString()
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create class.");
        return;
      }
      // API returns { created: [...], count }
      const createdArray: TimetableClass[] = (data.created ?? [data]).map((lc: Record<string, unknown>) => ({
        id: lc.id as string,
        title: lc.title as string,
        scheduledAt: lc.scheduledAt as string,
        durationMin: lc.durationMin as number,
        joinUrl: lc.joinUrl as string,
        platform: lc.platform as string,
        status: lc.status as string,
        venue: (lc.venue as string | null) ?? null,
        recordingUrl: null,
        cancelReason: null,
        rescheduleReason: null,
        originalScheduledAt: null,
        studentCount: 0,
        course: (lc.course as TimetableClass["course"]) ?? { id: form.courseId, title: "", courseCode: null },
        block: null,
      }));
      onCreated(createdArray);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Schedule a new class"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-bold text-lg text-primary">Schedule a class</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-surface transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="label" htmlFor="cc-course">Course</label>
            <select
              id="cc-course"
              value={form.courseId}
              required
              onChange={(e) => {
                set("courseId", e.target.value);
                set("blockId", "");
                loadBlocks(e.target.value);
              }}
              className="input"
            >
              <option value="">Select course...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          {courseBlocks.length > 0 && (
            <div>
              <label className="label" htmlFor="cc-block">Block / Course unit (optional)</label>
              <select id="cc-block" value={form.blockId} onChange={(e) => set("blockId", e.target.value)} className="input">
                <option value="">No specific block</option>
                {courseBlocks.map((b) => (
                  <option key={b.id} value={b.id}>Block {b.order}: {b.title}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label" htmlFor="cc-title">Title</label>
            <input
              id="cc-title"
              type="text"
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="input"
              placeholder="e.g. Block 4 Live: Vital Signs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="cc-scheduled">Date and time</label>
              <input
                id="cc-scheduled"
                type="datetime-local"
                required
                value={form.scheduledAt}
                onChange={(e) => set("scheduledAt", e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="cc-duration">Duration (minutes)</label>
              <input
                id="cc-duration"
                type="number"
                min="15"
                max="480"
                required
                value={form.durationMin}
                onChange={(e) => set("durationMin", e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="cc-venue">Venue (optional)</label>
            <input
              id="cc-venue"
              type="text"
              value={form.venue}
              onChange={(e) => set("venue", e.target.value)}
              className="input"
              placeholder="e.g. Skills Lab A or Online (Google Meet)"
            />
          </div>

          <div>
            <label className="label" htmlFor="cc-platform">Platform</label>
            <select
              id="cc-platform"
              value={form.platform}
              onChange={(e) => set("platform", e.target.value)}
              className="input"
            >
              <option value="link">Google Meet, Zoom, or external link</option>
              <option value="google_meet">Google Meet</option>
              <option value="zoom">Zoom</option>
              <option value="bbb">BigBlueButton</option>
              <option value="jitsi">Jitsi</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="cc-url">Join URL</label>
            <input
              id="cc-url"
              type="url"
              required={form.platform === "link" || form.platform === "google_meet" || form.platform === "zoom"}
              value={form.joinUrl}
              onChange={(e) => set("joinUrl", e.target.value)}
              className="input"
              placeholder="https://meet.google.com/..."
            />
          </div>

          <div>
            <label className="label" htmlFor="cc-repeat">Repeat weekly until (optional)</label>
            <input
              id="cc-repeat"
              type="date"
              value={form.repeatWeeklyUntil}
              onChange={(e) => set("repeatWeeklyUntil", e.target.value)}
              className="input"
            />
            <p className="text-xs text-gray-400 mt-1">Creates a class every week on the same day and time until this date.</p>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.selfCheckIn}
              onChange={(e) => set("selfCheckIn", e.target.checked)}
              className="rounded"
            />
            Allow self check-in (opens 15 min before, closes 30 min after start)
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? "Scheduling..." : "Schedule class"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
