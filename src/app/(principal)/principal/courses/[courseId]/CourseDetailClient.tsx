"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Lesson {
  id: string;
  title: string;
  type: string;
  order: number;
}

interface Block {
  id: string;
  order: number;
  title: string;
  description: string | null;
  prerequisiteBlockOrder: number | null;
  lessons: Lesson[];
  _count: { lessons: number };
}

interface Course {
  id: string;
  title: string;
  courseCode: string | null;
  description: string;
  status: string;
  category: string;
  durationMonths: number | null;
  tutor: { id: string; name: string };
  blocks: Block[];
  _count: { enrolments: number; blocks: number };
}

interface Props {
  course: Course;
  canEdit: boolean;
}

export default function CourseDetailClient({ course, canEdit }: Props) {
  const router = useRouter();
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [blockForm, setBlockForm] = useState({
    title: "",
    description: "",
    prerequisiteBlockOrder: null as number | null,
  });

  const handleCreateBlock = () => {
    setBlockForm({ title: "", description: "", prerequisiteBlockOrder: null });
    setEditingBlock(null);
    setShowBlockDialog(true);
  };

  const handleEditBlock = (block: Block) => {
    setBlockForm({
      title: block.title,
      description: block.description ?? "",
      prerequisiteBlockOrder: block.prerequisiteBlockOrder,
    });
    setEditingBlock(block);
    setShowBlockDialog(true);
  };

  const handleSubmitBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/principal/blocks", {
        method: editingBlock ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...blockForm,
          courseId: course.id,
          blockId: editingBlock?.id,
          order: editingBlock ? editingBlock.order : (course.blocks.length + 1),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save block");
      }

      router.refresh();
      setShowBlockDialog(false);
      setBlockForm({ title: "", description: "", prerequisiteBlockOrder: null });
      setEditingBlock(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm("Delete this course unit? All lessons inside it will also be deleted."))
      return;

    setLoading(true);
    try {
      const res = await fetch("/api/principal/blocks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId }),
      });

      if (!res.ok) throw new Error("Failed to delete block");
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const STATUS_BADGE: Record<string, string> = {
    PUBLISHED: "badge-success",
    DRAFT: "badge-warning",
    ARCHIVED: "badge-neutral",
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-4">
        <Link href="/principal/courses" className="text-sm text-gray-500 hover:underline">
          ← Back to Courses
        </Link>
      </div>

      <div className="card mb-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h1 className="text-2xl font-bold">{course.title}</h1>
            {course.courseCode && (
              <p className="font-mono text-sm text-gray-400 mt-1">{course.courseCode}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`badge ${STATUS_BADGE[course.status] ?? "badge-info"}`}>
              {course.status}
            </span>
            <span
              className={`badge text-xs ${course.category === "PROFESSIONAL" ? "badge-info" : "badge-neutral"}`}
            >
              {course.category}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">{course.description.substring(0, 300)}...</p>

        <div className="flex items-center gap-6 text-sm text-gray-500">
          <span>👤 {course.tutor.name}</span>
          <span>👥 {course._count.enrolments} enrolled</span>
          {course.durationMonths && <span>⏱ {course.durationMonths} months</span>}
          <span>📦 {course._count.blocks} blocks</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          Course Units (Blocks) ({course.blocks.length})
        </h2>
        {canEdit && (
          <button onClick={handleCreateBlock} className="btn-primary text-sm">
            + Add Block
          </button>
        )}
      </div>

      {course.blocks.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📦</p>
          <p className="text-gray-500 text-sm">No course units (blocks) yet.</p>
          {canEdit && (
            <button onClick={handleCreateBlock} className="btn-primary text-sm mt-4">
              Create First Block
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {course.blocks.map((block) => (
            <div key={block.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge badge-neutral text-xs">Block {block.order}</span>
                    <h3 className="font-semibold">{block.title}</h3>
                  </div>
                  {block.description && (
                    <p className="text-sm text-gray-500 mb-2">{block.description}</p>
                  )}
                  {block.prerequisiteBlockOrder && (
                    <p className="text-xs text-amber-600 mb-2">
                      🔒 Requires completion of Block {block.prerequisiteBlockOrder}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    {block._count.lessons} lesson{block._count.lessons !== 1 ? "s" : ""}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditBlock(block)}
                      className="btn-ghost text-xs"
                      disabled={loading}
                    >
                      ✏ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBlock(block.id)}
                      className="btn-ghost text-xs text-red-600"
                      disabled={loading}
                    >
                      🗑 Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 card bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-900">
          <strong>ℹ Note:</strong> Changes to course units require Director approval. After
          editing, submit a course change request via the main{" "}
          <Link href="/principal/courses" className="underline font-medium">
            Courses page
          </Link>
          .
        </p>
      </div>

      {showBlockDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingBlock ? "Edit Block" : "Create Block"}
              </h2>
              <button onClick={() => setShowBlockDialog(false)} className="btn-ghost text-lg">
                ×
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmitBlock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Block Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={blockForm.title}
                  onChange={(e) => setBlockForm({ ...blockForm, title: e.target.value })}
                  className="input w-full"
                  placeholder="Module 1: Introduction to Patient Care"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  rows={4}
                  value={blockForm.description}
                  onChange={(e) =>
                    setBlockForm({ ...blockForm, description: e.target.value })
                  }
                  className="input w-full"
                  placeholder="Brief description of topics covered in this block..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Prerequisite Block</label>
                <select
                  value={blockForm.prerequisiteBlockOrder ?? ""}
                  onChange={(e) =>
                    setBlockForm({
                      ...blockForm,
                      prerequisiteBlockOrder: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  className="input w-full"
                >
                  <option value="">None</option>
                  {course.blocks
                    .filter((b) => !editingBlock || b.order < editingBlock.order)
                    .map((b) => (
                      <option key={b.id} value={b.order}>
                        Block {b.order}: {b.title}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Students must complete the exam in this block before accessing this one
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowBlockDialog(false)}
                  className="btn-ghost"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Saving..." : editingBlock ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
