"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const LESSON_ICON: Record<string, string> = {
  VIDEO: "🎥",
  NOTES: "📄",
  QUIZ: "📝",
};

type Material = {
  id: string;
  title: string;
  type: string;
  bunnyVideoId: string | null;
  notesS3Key: string | null;
  isFreePreview: boolean;
  archivedAt: Date | null;
  durationSec: number | null;
  visibleScope: string;
  block: {
    id: string;
    title: string;
    course: {
      id: string;
      title: string;
      courseCode: string;
    };
  };
  _count: {
    progress: number;
  };
};

type Props = {
  materials: Material[];
  courses: { id: string; title: string; courseCode: string }[];
  selectedCourseId: string | null;
  searchQuery: string;
  statusFilter: string;
  typeFilter: string;
  archivedCount: number;
  canUpload: boolean;
  canArchive: boolean;
  userId: string;
};

export default function MaterialsView({
  materials,
  courses,
  selectedCourseId,
  searchQuery,
  statusFilter,
  typeFilter,
  archivedCount,
  canUpload,
  canArchive,
  userId,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(searchQuery);
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (selectedCourseId) params.set("courseId", selectedCourseId);
    if (search && key !== "search") params.set("search", search);
    if (statusFilter && key !== "status") params.set("status", statusFilter);
    if (typeFilter && key !== "type") params.set("type", typeFilter);
    
    if (value) params.set(key, value);
    
    router.push(`/principal/materials?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange("search", search);
  };

  const handleArchive = async (materialId: string, archive: boolean) => {
    const action = archive ? "archive" : "restore";
    const reason = prompt(`Reason for ${action} (required):`);
    
    if (!reason || reason.trim().length < 10) {
      alert("Reason must be at least 10 characters");
      return;
    }

    if (!confirm(`${archive ? "Archive" : "Restore"} this material?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/principal/materials/${materialId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) throw new Error(`Failed to ${action} material`);

      alert(`Material ${archive ? "archived" : "restored"} successfully`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(`Failed to ${action} material`);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Group by block
  const groupedMaterials = materials.reduce((acc, material) => {
    const blockKey = `${material.block.course.courseCode} - ${material.block.title}`;
    if (!acc[blockKey]) {
      acc[blockKey] = [];
    }
    acc[blockKey].push(material);
    return acc;
  }, {} as Record<string, Material[]>);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Learning Materials</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse, search, preview, and manage all course materials. Students stream only, no downloads.
          </p>
        </div>
        {canUpload && (
          <Link href="/principal/materials/upload" className="btn-primary no-underline">
            + Upload Material
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="space-y-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search materials by title or content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input flex-1"
            />
            <button type="submit" className="btn-primary">
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  handleFilterChange("search", "");
                }}
                className="btn-secondary"
              >
                Clear
              </button>
            )}
          </form>

          {/* Filter row */}
          <div className="flex gap-3 flex-wrap">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Course</label>
              <select
                value={selectedCourseId || ""}
                onChange={(e) => handleFilterChange("courseId", e.target.value)}
                className="input text-sm"
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.courseCode} - {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => handleFilterChange("type", e.target.value)}
                className="input text-sm"
              >
                <option value="">All Types</option>
                <option value="VIDEO">Video</option>
                <option value="NOTES">Notes/PDF</option>
                <option value="QUIZ">Quiz</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="input text-sm"
              >
                <option value="active">Active ({materials.length})</option>
                <option value="archived">Archived ({archivedCount})</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {materials.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📖</p>
          <p className="text-gray-500 text-sm">
            {search
              ? `No materials found for "${search}"`
              : statusFilter === "archived"
              ? "No archived materials"
              : "No materials found"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedMaterials).map(([blockTitle, blockMaterials]) => (
            <div key={blockTitle} className="card">
              <h2 className="font-semibold text-base mb-3 text-gray-700 dark:text-gray-300">
                {blockTitle}
              </h2>
              <div className="space-y-2">
                {blockMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                  >
                    <span className="text-xl flex-shrink-0">
                      {LESSON_ICON[material.type] ?? "📄"}
                    </span>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{material.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{material.type}</span>
                        {material.durationSec && (
                          <>
                            <span className="text-xs text-gray-300">•</span>
                            <span className="text-xs text-gray-400">
                              {formatDuration(material.durationSec)}
                            </span>
                          </>
                        )}
                        {material._count.progress > 0 && (
                          <>
                            <span className="text-xs text-gray-300">•</span>
                            <span className="text-xs text-gray-400">
                              {material._count.progress} student{material._count.progress !== 1 ? "s" : ""}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {material.isFreePreview && (
                      <span className="badge badge-info text-xs flex-shrink-0">Preview</span>
                    )}

                    {material.archivedAt && (
                      <span className="badge badge-secondary text-xs flex-shrink-0">Archived</span>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setPreviewMaterial(material)}
                        className="btn-secondary text-xs px-2 py-1"
                        title="Preview (protected viewer)"
                      >
                        👁️ Preview
                      </button>

                      {canArchive && (
                        <button
                          onClick={() => handleArchive(material.id, !material.archivedAt)}
                          disabled={loading}
                          className="btn-secondary text-xs px-2 py-1"
                          title={material.archivedAt ? "Restore" : "Archive"}
                        >
                          {material.archivedAt ? "↩️" : "🗃️"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewMaterial && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setPreviewMaterial(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">{previewMaterial.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {previewMaterial.block.course.courseCode} - {previewMaterial.block.title}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewMaterial(null)}
                  className="text-2xl text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 text-center">
                {previewMaterial.type === "VIDEO" && previewMaterial.bunnyVideoId ? (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      🎥 Video ID: {previewMaterial.bunnyVideoId}
                    </p>
                    <p className="text-xs text-gray-500">
                      Protected video player would be embedded here (Bunny Stream)
                    </p>
                  </div>
                ) : previewMaterial.type === "NOTES" && previewMaterial.notesS3Key ? (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      📄 Document: {previewMaterial.notesS3Key.split("/").pop()}
                    </p>
                    <p className="text-xs text-gray-500">
                      Protected document viewer would be embedded here (S3 presigned URL)
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-500">No preview available for this material type</p>
                  </div>
                )}
              </div>

              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  🔒 Protected Viewer
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  Students can only view/stream materials within the platform. No download buttons.
                  All views are tracked and audit logged.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
