"use client";

import { useState } from "react";
import { Plus, RefreshCcw, Send } from "lucide-react";
import { useRouter } from "next/navigation";

type Course = {
  id: string;
  title: string;
  code: string;
};

type Intake = {
  id: string;
  year: number;
  semester: number;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  audienceType: string;
  status: string;
  createdAt: string;
  createdBy: { name: string };
  targetCourse: { code: string } | null;
  targetIntake: { year: number; semester: number } | null;
};

interface Props {
  courses: Course[];
  intakes: Intake[];
  initialAnnouncements: Announcement[];
}

export default function AnnouncementsClient({
  courses,
  intakes,
  initialAnnouncements,
}: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audienceType, setAudienceType] = useState("STAFF");
  const [targetCourseId, setTargetCourseId] = useState("");
  const [targetIntakeId, setTargetIntakeId] = useState("");
  const [channel, setChannel] = useState("IN_APP");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          audienceType,
          targetCourseId: targetCourseId || null,
          targetIntakeId: targetIntakeId || null,
          channel,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "Could not create announcement");
      }

      // Reset form
      setTitle("");
      setBody("");
      setAudienceType("STAFF");
      setTargetCourseId("");
      setTargetIntakeId("");
      setChannel("IN_APP");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create announcement");
    } finally {
      setSubmitting(false);
    }
  }

  const statusColors = {
    DRAFT: "bg-gray-100 text-gray-800",
    PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
    PUBLISHED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <p className="font-medium text-blue-900 mb-2">Approval Workflow</p>
        <ul className="text-blue-800 space-y-1 list-disc list-inside">
          <li>
            <strong>Operational notices</strong> (staff, course, intake, class): sent
            immediately
          </li>
          <li>
            <strong>Institution-wide announcements</strong>: require Principal approval
          </li>
        </ul>
      </div>

      {/* Create Button */}
      {!showForm && (
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> New Announcement
          </button>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" /> Refresh
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div className="flex justify-between items-start">
            <h2 className="text-lg font-semibold">Create Announcement</h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
              {error}
            </p>
          )}

          <label className="label">
            Subject
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              minLength={5}
              maxLength={200}
              required
            />
          </label>

          <label className="label">
            Message
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="input"
              rows={6}
              minLength={10}
              maxLength={2000}
              required
            />
          </label>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="label">
              Audience
              <select
                value={audienceType}
                onChange={(e) => {
                  setAudienceType(e.target.value);
                  setTargetCourseId("");
                  setTargetIntakeId("");
                }}
                className="input"
                required
              >
                <option value="STAFF">Staff</option>
                <option value="STUDENTS">All Students</option>
                <option value="COURSE">Specific Course</option>
                <option value="INTAKE">Specific Intake</option>
                <option value="ALL">Institution-wide (requires approval)</option>
              </select>
            </label>

            <label className="label">
              Delivery
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="input"
                required
              >
                <option value="IN_APP">In-platform notification</option>
                <option value="EMAIL">Notification and email</option>
              </select>
            </label>
          </div>

          {audienceType === "COURSE" && (
            <label className="label">
              Target Course
              <select
                value={targetCourseId}
                onChange={(e) => setTargetCourseId(e.target.value)}
                className="input"
                required
              >
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          {audienceType === "INTAKE" && (
            <label className="label">
              Target Intake
              <select
                value={targetIntakeId}
                onChange={(e) => setTargetIntakeId(e.target.value)}
                className="input"
                required
              >
                <option value="">Select an intake</option>
                {intakes.map((intake) => (
                  <option key={intake.id} value={intake.id}>
                    {intake.year} Semester {intake.semester}
                  </option>
                ))}
              </select>
            </label>
          )}

          {audienceType === "ALL" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              ℹ️ Institution-wide announcements require Principal approval before being sent.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Sending..." : audienceType === "ALL" ? "Submit for Approval" : "Send Now"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">My Announcements</h2>
        
        {initialAnnouncements.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-500">No announcements yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {initialAnnouncements.map((announcement) => (
              <article key={announcement.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {announcement.audienceType.replace("_", " ")}
                      {announcement.targetCourse && ` - ${announcement.targetCourse.code}`}
                      {announcement.targetIntake && ` - ${announcement.targetIntake.year} S${announcement.targetIntake.semester}`}
                      {" · "}
                      {new Date(announcement.createdAt).toLocaleString("en-UG")}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[announcement.status as keyof typeof statusColors] ?? statusColors.DRAFT}`}>
                    {announcement.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {announcement.body}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
