"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Department {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  headId: string | null;
  head: { id: string; name: string; role: string } | null;
  courses: Array<{
    course: {
      id: string;
      title: string;
      status: string;
    };
  }>;
  _count: { courses: number };
}

interface User {
  id: string;
  name: string;
  role: string;
}

interface Props {
  departments: Department[];
  potentialHeads: User[];
  canEdit: boolean;
}

export default function DepartmentsClient({ departments, potentialHeads, canEdit }: Props) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    headId: "",
  });

  const handleCreate = () => {
    setFormData({ name: "", description: "", headId: "" });
    setEditingDept(null);
    setShowDialog(true);
  };

  const handleEdit = (dept: Department) => {
    setFormData({
      name: dept.name,
      description: dept.description ?? "",
      headId: dept.headId ?? "",
    });
    setEditingDept(dept);
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/principal/departments", {
        method: editingDept ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          id: editingDept?.id,
          headId: formData.headId || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save department");
      }

      router.refresh();
      setShowDialog(false);
      setFormData({ name: "", description: "", headId: "" });
      setEditingDept(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (dept: Department) => {
    if (
      !confirm(
        `Archive "${dept.name}"? It will be hidden but can be restored later.${dept._count.courses > 0 ? ` (${dept._count.courses} programme(s) assigned)` : ""}`,
      )
    )
      return;

    setLoading(true);
    try {
      const res = await fetch("/api/principal/departments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: dept.id, isActive: false }),
      });

      if (!res.ok) throw new Error("Failed to archive department");
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (dept: Department) => {
    setLoading(true);
    try {
      const res = await fetch("/api/principal/departments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: dept.id, isActive: true }),
      });

      if (!res.ok) throw new Error("Failed to restore department");
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const activeDepts = departments.filter((d) => d.isActive);
  const archivedDepts = departments.filter((d) => !d.isActive);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeDepts.length} active, {archivedDepts.length} archived
          </p>
        </div>
        {canEdit && (
          <button onClick={handleCreate} className="btn-primary text-sm">
            + Create Department
          </button>
        )}
      </div>

      {activeDepts.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📂</p>
          <p className="text-gray-500 text-sm">No active departments yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {activeDepts.map((d) => (
            <div key={d.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="font-semibold text-base">{d.name}</h2>
                <span className="badge badge-success text-xs">Active</span>
              </div>
              
              <p className="text-sm text-gray-500 mb-3">{d.description}</p>

              {d.head && (
                <p className="text-xs text-gray-600 mb-2">
                  👤 Head: <span className="font-medium">{d.head.name}</span>
                </p>
              )}

              <p className="text-xs text-gray-500 mb-3">
                📚 {d._count.courses} programme{d._count.courses !== 1 ? "s" : ""}
              </p>

              {canEdit && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <button onClick={() => handleEdit(d)} className="btn-ghost text-xs flex-1">
                    ✏ Edit
                  </button>
                  <button
                    onClick={() => handleArchive(d)}
                    className="btn-ghost text-xs text-red-600"
                    disabled={loading}
                  >
                    🗄 Archive
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {archivedDepts.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Archived Departments</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {archivedDepts.map((d) => (
              <div key={d.id} className="card opacity-60 hover:opacity-100 transition-opacity">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-base">{d.name}</h3>
                  <span className="badge badge-neutral text-xs">Archived</span>
                </div>
                <p className="text-sm text-gray-500 mb-3">{d.description}</p>
                {canEdit && (
                  <button
                    onClick={() => handleRestore(d)}
                    className="btn-ghost text-xs text-green-600"
                    disabled={loading}
                  >
                    ↻ Restore
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingDept ? "Edit Department" : "Create Department"}
              </h2>
              <button
                onClick={() => setShowDialog(false)}
                className="btn-ghost text-lg"
              >
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
                  Department Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                  placeholder="Home Care"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="input w-full"
                  placeholder="Brief description of the department's focus..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Department Head</label>
                <select
                  value={formData.headId}
                  onChange={(e) => setFormData({ ...formData, headId: e.target.value })}
                  className="input w-full"
                >
                  <option value="">None</option>
                  {potentialHeads.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.role})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Must be an Instructor or Principal
                </p>
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
                  {loading ? "Saving..." : editingDept ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
