"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UnifiedEvent = {
  id: string;
  date: Date;
  endDate?: Date | null;
  label: string;
  description?: string | null;
  type: "intake" | "exam" | "class" | "calendar_event";
  eventType?: string;
  isAllDay?: boolean;
  createdBy?: { id: string; name: string };
};

type Props = {
  events: UnifiedEvent[];
  canEdit: boolean;
};

export default function CalendarView({ events: initialEvents, canEdit }: Props) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<UnifiedEvent | null>(null);
  const [loading, setLoading] = useState(false);

  const TYPE_ICON: Record<string, string> = {
    intake: "📅",
    exam: "📝",
    class: "🎓",
    calendar_event: "🗓️",
  };

  const TYPE_COLOR: Record<string, string> = {
    intake: "border-l-primary",
    exam: "border-l-warning",
    class: "border-l-green-500",
    calendar_event: "border-l-blue-500",
  };

  const TYPE_LABEL: Record<string, string> = {
    INTAKE: "Intake Date",
    EXAM_PERIOD: "Exam Period",
    HOLIDAY: "Holiday",
    OTHER: "Other Event",
  };

  const handleCreateOrUpdate = async (formData: FormData) => {
    setLoading(true);
    try {
      const data = {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        eventDate: formData.get("eventDate") as string,
        endDate: formData.get("endDate") as string || undefined,
        eventType: formData.get("eventType") as string,
        isAllDay: formData.get("isAllDay") === "true",
      };

      if (editingEvent) {
        const response = await fetch("/api/principal/calendar", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingEvent.id, ...data }),
        });

        if (!response.ok) throw new Error("Failed to update event");
      } else {
        const response = await fetch("/api/principal/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error("Failed to create event");
      }

      setShowForm(false);
      setEditingEvent(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to save event");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Delete this calendar event? This cannot be undone.")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/principal/calendar?id=${eventId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete event");

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to delete event");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event: UnifiedEvent) => {
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingEvent(null);
  };

  const handleExport = () => {
    window.open("/api/principal/calendar/export", "_blank");
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Academic Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Intakes, classes, exams, and events</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="btn-secondary text-sm"
            title="Download .ics file for calendar apps"
          >
            📥 Export .ics
          </button>
          {canEdit && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary text-sm"
            >
              + Add Event
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingEvent ? "Edit Event" : "Create Calendar Event"}
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateOrUpdate(new FormData(e.currentTarget));
            }}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={editingEvent?.label}
                  className="input w-full"
                  placeholder="e.g., Winter Break, Exam Period"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingEvent?.description || ""}
                  className="input w-full"
                  placeholder="Additional details..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Event Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="eventType"
                    required
                    defaultValue={editingEvent?.eventType || "OTHER"}
                    className="input w-full"
                  >
                    <option value="INTAKE">Intake Date</option>
                    <option value="EXAM_PERIOD">Exam Period</option>
                    <option value="HOLIDAY">Holiday</option>
                    <option value="OTHER">Other Event</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-1">
                    <input
                      type="checkbox"
                      name="isAllDay"
                      value="true"
                      defaultChecked={editingEvent?.isAllDay ?? true}
                      className="checkbox"
                    />
                    All-day event
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="eventDate"
                    required
                    defaultValue={
                      editingEvent?.date
                        ? new Date(editingEvent.date).toISOString().split("T")[0]
                        : ""
                    }
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    name="endDate"
                    defaultValue={
                      editingEvent?.endDate
                        ? new Date(editingEvent.endDate).toISOString().split("T")[0]
                        : ""
                    }
                    className="input w-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? "Saving..." : editingEvent ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {events.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📅</p>
          <p className="text-gray-500 text-sm">No events scheduled.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <div
              key={`${e.type}-${e.id}`}
              className={`card border-l-4 ${TYPE_COLOR[e.type]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-xl" aria-hidden="true">
                    {TYPE_ICON[e.type]}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{e.label}</p>
                    {e.description && (
                      <p className="text-xs text-gray-500 mt-1">{e.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(e.date).toLocaleDateString("en-UG", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {e.endDate &&
                        ` - ${new Date(e.endDate).toLocaleDateString("en-UG", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}`}
                    </p>
                    {e.eventType && (
                      <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                        {TYPE_LABEL[e.eventType] || e.eventType}
                      </span>
                    )}
                  </div>
                </div>

                {canEdit && e.type === "calendar_event" && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(e)}
                      className="btn-secondary text-xs px-2 py-1"
                      title="Edit event"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="btn-danger text-xs px-2 py-1"
                      title="Delete event"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
        <p className="font-medium mb-2">📘 Calendar Notes:</p>
        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 ml-4 list-disc">
          <li>📅 Intake dates are automatically imported from Intakes</li>
          <li>📝 Exam periods are derived from published exams</li>
          <li>🎓 Classes show all scheduled live sessions</li>
          <li>🗓️ Custom calendar events can be created for holidays, deadlines, etc.</li>
          <li>Export the calendar as .ics to subscribe in Outlook, Google Calendar, or Apple Calendar</li>
        </ul>
      </div>
    </div>
  );
}
