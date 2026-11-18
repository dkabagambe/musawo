"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";

interface Course {
  id: string;
  title: string;
  courseCode: string | null;
}

interface Block {
  id: string;
  title: string;
}

interface Instructor {
  id: string;
  name: string;
}

interface LiveClass {
  id: string;
  title: string;
  scheduledAt: Date;
  durationMin: number;
  venue: string | null;
  status: string;
  course: { id: string; title: string };
  block: { id: string; title: string } | null;
  tutor: { id: string; name: string };
  joinUrl: string;
  cancelReason: string | null;
  _count: { attendance: number };
}

interface Conflict {
  type: "instructor" | "venue";
  message: string;
  existingClass: {
    id: string;
    title: string;
    scheduledAt: Date;
    durationMin: number;
  };
}

interface Props {
  classes: LiveClass[];
  courses: Course[];
  blocks: { [courseId: string]: Block[] };
  instructors: Instructor[];
  canEdit: boolean;
}

export default function TimetableClient({
  classes,
  courses,
  blocks,
  instructors,
  canEdit,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<"week" | "list">("week");
  const [showDialog, setShowDialog] = useState(false);
  const [editingClass, setEditingClass] = useState<LiveClass | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelingClass, setCancelingClass] = useState<LiveClass | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    courseId: "",
    blockId: "",
    tutorId: "",
    title: "",
    description: "",
    scheduledAt: "",
    durationMin: 60,
    venue: "Online",
    joinUrl: "",
  });

  const handleCreate = () => {
    setFormData({
      courseId: "",
      blockId: "",
      tutorId: "",
      title: "",
      description: "",
      scheduledAt: "",
      durationMin: 60,
      venue: "Online",
      joinUrl: "",
    });
    setEditingClass(null);
    setConflicts([]);
    setShowDialog(true);
  };

  const handleEdit = (liveClass: LiveClass) => {
    setFormData({
      courseId: liveClass.course.id,
      blockId: liveClass.block?.id || "",
      tutorId: liveClass.tutor.id,
      title: liveClass.title,
      description: "",
      scheduledAt: new Date(liveClass.scheduledAt).toISOString().slice(0, 16),
      durationMin: liveClass.durationMin,
      venue: liveClass.venue || "Online",
      joinUrl: liveClass.joinUrl,
    });
    setEditingClass(liveClass);
    setConflicts([]);
    setShowDialog(true);
  };

  const checkConflicts = async () => {
    if (!formData.scheduledAt || !formData.tutorId) return;

    try {
      const res = await fetch("/api/principal/timetable/conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: formData.scheduledAt,
          durationMin: formData.durationMin,
          tutorId: formData.tutorId,
          venue: formData.venue,
          excludeClassId: editingClass?.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setConflicts(data.conflicts || []);
      }
    } catch (err) {
      console.error("Failed to check conflicts:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/principal/timetable", {
        method: editingClass ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          id: editingClass?.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save class");
      }

      router.refresh();
      setShowDialog(false);
      setEditingClass(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (liveClass: LiveClass) => {
    setCancelingClass(liveClass);
    setShowCancelDialog(true);
  };

  const confirmCancel = async (reason: string) => {
    if (!cancelingClass || !reason.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/principal/timetable", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cancelingClass.id,
          cancelReason: reason,
        }),
      });

      if (!res.ok) throw new Error("Failed to cancel class");

      router.refresh();
      setShowCancelDialog(false);
      setCancelingClass(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = (liveClass: LiveClass) => {
    setFormData({
      courseId: liveClass.course.id,
      blockId: liveClass.block?.id || "",
      tutorId: liveClass.tutor.id,
      title: liveClass.title,
      description: "",
      scheduledAt: "", // User needs to pick new time
      durationMin: liveClass.durationMin,
      venue: liveClass.venue || "Online",
      joinUrl: liveClass.joinUrl,
    });
    setEditingClass(liveClass);
    setConflicts([]);
    setShowDialog(true);
  };

  // Group classes by date for week view
  const groupByDate = (classList: LiveClass[]) => {
    const groups: { [key: string]: LiveClass[] } = {};
    classList.forEach((c) => {
      const date = format(new Date(c.scheduledAt), "yyyy-MM-dd");
      if (!groups[date]) groups[date] = [];
      groups[date].push(c);
    });
    return groups;
  };

  const grouped = groupByDate(classes);
  const dates = Object.keys(grouped).sort();

  const courseBlocks = formData.courseId ? blocks[formData.courseId] || [] : [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Timetable Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create, schedule, and manage live classes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="btn-group">
            <button
              onClick={() => setView("week")}
              className={`btn-sm ${view === "week" ? "btn-primary" : "btn-ghost"}`}
            >
              Week
            </button>
            <button
              onClick={() => setView("list")}
              className={`btn-sm ${view === "list" ? "btn-primary" : "btn-ghost"}`}
            >
              List
            </button>
          </div>
          {canEdit && (
            <button onClick={handleCreate} className="btn-primary text-sm">
              + Schedule Class
            </button>
          )}
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📅</p>
          <p className="text-gray-500 text-sm">No classes scheduled yet.</p>
          {canEdit && (
            <button onClick={handleCreate} className="btn-primary mt-4">
              Schedule First Class
            </button>
          )}
        </div>
      ) : view === "list" ? (
        <div className="space-y-3">
          {classes.map((liveClass) => (
            <div key={liveClass.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="font-semibold">{liveClass.title}</h2>
                    <span
                      className={`badge text-xs ${
                        liveClass.status === "SCHEDULED"
                          ? "badge-info"
                          : liveClass.status === "LIVE"
                            ? "badge-success"
                            : liveClass.status === "COMPLETED"
                              ? "badge-neutral"
                              : "badge-danger"
                      }`}
                    >
                      {liveClass.status}
                    </span>
                    {liveClass.cancelReason && (
                      <span className="text-xs text-danger">Cancelled</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    {liveClass.course.title}
                    {liveClass.block && ` - ${liveClass.block.title}`}
                  </p>
                  <p className="text-sm text-gray-500">
                    👤 {liveClass.tutor.name} • 📅{" "}
                    {format(new Date(liveClass.scheduledAt), "PPp")} •{" "}
                    ⏱️ {liveClass.durationMin}min • 📍 {liveClass.venue || "Online"}
                  </p>
                  {liveClass._count.attendance > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      {liveClass._count.attendance} student(s) registered
                    </p>
                  )}
                  {liveClass.cancelReason && (
                    <p className="text-xs text-danger mt-2">
                      Reason: {liveClass.cancelReason}
                    </p>
                  )}
                </div>
                {canEdit && liveClass.status === "SCHEDULED" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(liveClass)}
                      className="btn-ghost text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleReschedule(liveClass)}
                      className="btn-ghost text-xs"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => handleCancel(liveClass)}
                      className="btn-ghost text-danger text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {dates.map((date) => (
            <div key={date}>
              <h2 className="font-bold text-lg mb-3">
                {format(new Date(date), "EEEE, MMMM d, yyyy")}
              </h2>
              <div className="space-y-2">
                {grouped[date]
                  .sort(
                    (a, b) =>
                      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
                  )
                  .map((liveClass) => (
                    <div
                      key={liveClass.id}
                      className="card border-l-4 border-l-primary hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-semibold">
                              {format(new Date(liveClass.scheduledAt), "h:mm a")}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="font-mono text-sm text-gray-600">
                              {format(
                                addDays(
                                  new Date(liveClass.scheduledAt),
                                  liveClass.durationMin / (24 * 60),
                                ),
                                "h:mm a",
                              )}
                            </span>
                            <span className="badge badge-info text-xs">
                              {liveClass.durationMin}min
                            </span>
                          </div>
                          <h3 className="font-semibold">{liveClass.title}</h3>
                          <p className="text-sm text-gray-600">
                            {liveClass.course.title} • {liveClass.tutor.name} •{" "}
                            {liveClass.venue || "Online"}
                          </p>
                        </div>
                        {canEdit && liveClass.status === "SCHEDULED" && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEdit(liveClass)}
                              className="btn-ghost btn-sm text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleCancel(liveClass)}
                              className="btn-ghost btn-sm text-danger text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingClass ? "Edit Class" : "Schedule New Class"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="alert alert-error">
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="label">Course *</label>
                  <select
                    className="input"
                    value={formData.courseId}
                    onChange={(e) => {
                      setFormData({ ...formData, courseId: e.target.value, blockId: "" });
                      setConflicts([]);
                    }}
                    required
                  >
                    <option value="">Select course...</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} {c.courseCode && `(${c.courseCode})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Block (Optional)</label>
                  <select
                    className="input"
                    value={formData.blockId}
                    onChange={(e) => setFormData({ ...formData, blockId: e.target.value })}
                  >
                    <option value="">Select block...</option>
                    {courseBlocks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Instructor *</label>
                  <select
                    className="input"
                    value={formData.tutorId}
                    onChange={(e) => {
                      setFormData({ ...formData, tutorId: e.target.value });
                      setConflicts([]);
                    }}
                    onBlur={checkConflicts}
                    required
                  >
                    <option value="">Select instructor...</option>
                    {instructors.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Class Title *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Introduction to Home Care"
                    required
                  />
                </div>

                <div>
                  <label className="label">Scheduled Date & Time *</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={formData.scheduledAt}
                    onChange={(e) => {
                      setFormData({ ...formData, scheduledAt: e.target.value });
                      setConflicts([]);
                    }}
                    onBlur={checkConflicts}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Duration (minutes) *</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.durationMin}
                      onChange={(e) => {
                        setFormData({ ...formData, durationMin: parseInt(e.target.value) });
                        setConflicts([]);
                      }}
                      onBlur={checkConflicts}
                      min="15"
                      max="480"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Venue</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.venue}
                      onChange={(e) => {
                        setFormData({ ...formData, venue: e.target.value });
                        setConflicts([]);
                      }}
                      onBlur={checkConflicts}
                      placeholder="Online"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Meeting Link *</label>
                  <input
                    type="url"
                    className="input"
                    value={formData.joinUrl}
                    onChange={(e) => setFormData({ ...formData, joinUrl: e.target.value })}
                    placeholder="https://meet.google.com/..."
                    required
                  />
                </div>

                {conflicts.length > 0 && (
                  <div className="alert alert-warning">
                    <div>
                      <h3 className="font-semibold mb-2">⚠️ Scheduling Conflicts Detected</h3>
                      <ul className="text-sm space-y-1">
                        {conflicts.map((c, i) => (
                          <li key={i}>
                            <strong>{c.type === "instructor" ? "Instructor" : "Venue"}:</strong>{" "}
                            {c.message}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs mt-2">
                        You can still schedule this class, but conflicts should be resolved.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDialog(false);
                      setEditingClass(null);
                      setConflicts([]);
                    }}
                    className="btn-ghost"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? "Saving..." : editingClass ? "Update Class" : "Schedule Class"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Dialog */}
      {showCancelDialog && cancelingClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Cancel Class</h2>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to cancel "{cancelingClass.title}"? Students and the instructor
              will be notified.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const reason = (form.elements.namedItem("reason") as HTMLTextAreaElement).value;
                confirmCancel(reason);
              }}
            >
              <div className="mb-4">
                <label className="label">Cancellation Reason *</label>
                <textarea
                  name="reason"
                  className="input"
                  rows={3}
                  placeholder="Explain why this class is being cancelled..."
                  required
                  minLength={10}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelDialog(false);
                    setCancelingClass(null);
                  }}
                  className="btn-ghost"
                  disabled={loading}
                >
                  Keep Class
                </button>
                <button type="submit" className="btn-danger" disabled={loading}>
                  {loading ? "Cancelling..." : "Cancel Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
