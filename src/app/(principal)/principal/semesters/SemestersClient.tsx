"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Course {
  id: string;
  title: string;
  courseCode: string | null;
}

interface Intake {
  id: string;
  label: string;
  startDate: Date;
  endDate: Date;
  seats: number;
  isOpen: boolean;
  course: { id: string; title: string; courseCode: string | null };
  _count: { enrolments: number; applications: number };
}

interface Props {
  intakes: Intake[];
  courses: Course[];
  canEdit: boolean;
}

export default function SemestersClient({ intakes, courses, canEdit }: Props) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [editingIntake, setEditingIntake] = useState<Intake | null>(null);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closingIntake, setClosingIntake] = useState<Intake | null>(null);
  const [storagePreview, setStoragePreview] = useState<{
    recordings: number;
    materials: number;
    totalMB: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    courseId: "",
    label: "",
    startDate: "",
    endDate: "",
    seats: 50,
    isOpen: true,
  });

  const handleCreate = () => {
    setFormData({
      courseId: "",
      label: "",
      startDate: "",
      endDate: "",
      seats: 50,
      isOpen: true,
    });
    setEditingIntake(null);
    setShowDialog(true);
  };

  const handleEdit = (intake: Intake) => {
    setFormData({
      courseId: intake.course.id,
      label: intake.label,
      startDate: new Date(intake.startDate).toISOString().split("T")[0],
      endDate: new Date(intake.endDate).toISOString().split("T")[0],
      seats: intake.seats,
      isOpen: intake.isOpen,
    });
    setEditingIntake(intake);
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/principal/intakes", {
        method: editingIntake ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          id: editingIntake?.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save intake");
      }

      router.refresh();
      setShowDialog(false);
      setEditingIntake(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseIntake = async (intake: Intake) => {
    setClosingIntake(intake);
    setStoragePreview(null);
    setLoading(true);

    try {
      // Fetch storage preview
      const res = await fetch(`/api/principal/intakes/${intake.id}/storage-preview`);
      if (res.ok) {
        const data = await res.json();
        setStoragePreview(data);
      }
    } catch (err) {
      console.error("Failed to load storage preview:", err);
    } finally {
      setLoading(false);
      setShowCloseDialog(true);
    }
  };

  const confirmCloseIntake = async () => {
    if (!closingIntake) return;

    setLoading(true);
    try {
      const res = await fetch("/api/principal/intakes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: closingIntake.id,
          isOpen: false,
        }),
      });

      if (!res.ok) throw new Error("Failed to close intake");

      router.refresh();
      setShowCloseDialog(false);
      setClosingIntake(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Terms (Academic Years & Semesters)</h1>
          <p className="text-sm text-gray-500 mt-1">Intake periods across all programmes</p>
        </div>
        {canEdit && (
          <button onClick={handleCreate} className="btn-primary text-sm">
            + Create Intake
          </button>
        )}
      </div>

      {intakes.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📅</p>
          <p className="text-gray-500 text-sm">No intakes configured yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {intakes.map((intake) => {
            const startDate = new Date(intake.startDate);
            const endDate = new Date(intake.endDate);
            const isActive = intake.isOpen && startDate <= now && endDate >= now;
            const isUpcoming = startDate > now;
            const isPast = endDate < now;

            return (
              <div key={intake.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2 className="font-semibold">{intake.label}</h2>
                      {isActive && <span className="badge badge-success text-xs">Active</span>}
                      {isUpcoming && <span className="badge badge-info text-xs">Upcoming</span>}
                      {isPast && <span className="badge text-xs">Past</span>}
                      {!intake.isOpen && (
                        <span className="badge badge-danger text-xs">Closed</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {intake.course.title}{" "}
                      {intake.course.courseCode ? `(${intake.course.courseCode})` : ""}
                    </p>
                    <p className="text-xs text-gray-400">
                      {startDate.toLocaleDateString("en-UG")} to{" "}
                      {endDate.toLocaleDateString("en-UG")}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-primary">
                      {intake._count.enrolments}
                    </p>
                    <p className="text-xs text-gray-400">enrolled</p>
                    <p className="text-sm font-medium mt-1">{intake._count.applications}</p>
                    <p className="text-xs text-gray-400">applications</p>
                    <p className="text-xs text-gray-400 mt-1">{intake.seats} seats</p>
                  </div>
                </div>

                {canEdit && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <button onClick={() => handleEdit(intake)} className="btn-ghost text-xs">
                      ✏ Edit
                    </button>
                    {intake.isOpen && (
                      <button
                        onClick={() => handleCloseIntake(intake)}
                        className="btn-ghost text-xs text-amber-600"
                      >
                        🔒 Close Intake
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingIntake ? "Edit Intake" : "Create Intake"}
              </h2>
              <button onClick={() => setShowDialog(false)} className="btn-ghost text-lg">
                ×
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Programme <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  className="input w-full"
                  disabled={!!editingIntake}
                >
                  <option value="">Select programme...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} {c.courseCode ? `(${c.courseCode})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Intake Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="input w-full"
                  placeholder="November 2026 Cohort"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Available Seats <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={500}
                  value={formData.seats}
                  onChange={(e) =>
                    setFormData({ ...formData, seats: parseInt(e.target.value) })
                  }
                  className="input w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isOpen"
                  checked={formData.isOpen}
                  onChange={(e) => setFormData({ ...formData, isOpen: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="isOpen" className="text-sm font-medium">
                  Open for applications
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowDialog(false)}
                  className="btn-ghost"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Saving..." : editingIntake ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCloseDialog && closingIntake && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Close Intake</h2>
              <button
                onClick={() => setShowCloseDialog(false)}
                className="btn-ghost text-lg"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-700 mb-4">
              You are about to close <strong>{closingIntake.label}</strong> for{" "}
              <strong>{closingIntake.course.title}</strong>. No new applications will be
              accepted.
            </p>

            {storagePreview && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded mb-4">
                <p className="text-sm font-medium text-amber-900 mb-2">
                  📦 Storage Clearing Preview
                </p>
                <p className="text-sm text-amber-700">
                  Recordings: {storagePreview.recordings} files
                  <br />
                  Materials: {storagePreview.materials} files
                  <br />
                  Total size: {storagePreview.totalMB.toFixed(2)} MB
                  <br />
                  <br />
                  Content will be archived and moved to 14-day trash.
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowCloseDialog(false)}
                className="btn-ghost"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={confirmCloseIntake}
                className="btn-primary bg-amber-600 hover:bg-amber-700"
                disabled={loading}
              >
                {loading ? "Closing..." : "Confirm Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
