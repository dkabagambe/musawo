"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Course = {
  id: string;
  title: string;
  courseCode: string;
  blocks: {
    id: string;
    title: string;
    order: number;
  }[];
};

type Props = {
  courses: Course[];
  userId: string;
};

export default function UploadMaterialForm({ courses, userId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    blockId: "",
    type: "NOTES" as "VIDEO" | "NOTES" | "QUIZ",
    bunnyVideoId: "",
    notesS3Key: "",
    isFreePreview: false,
    durationSec: "",
    transcript: "",
  });

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.blockId) {
      alert("Please fill in all required fields");
      return;
    }

    if (formData.type === "VIDEO" && !formData.bunnyVideoId) {
      alert("Please provide a Bunny Video ID for video materials");
      return;
    }

    if (formData.type === "NOTES" && !formData.notesS3Key) {
      alert("Please provide an S3 key for notes/PDF materials");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/principal/materials/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          durationSec: formData.durationSec ? parseInt(formData.durationSec) : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload material");
      }

      alert("Material uploaded successfully!");
      router.push("/principal/materials");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to upload material");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/principal/materials"
          className="text-sm text-primary hover:underline mb-2 inline-block"
        >
          ← Back to Materials
        </Link>
        <h1 className="text-2xl font-bold">Upload Learning Material</h1>
        <p className="text-sm text-gray-500 mt-1">
          Add a new video, PDF, or quiz to any course. Materials are streamed only, never downloaded by students.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Course Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Course <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={selectedCourseId}
            onChange={(e) => {
              setSelectedCourseId(e.target.value);
              setFormData({ ...formData, blockId: "" });
            }}
            className="input"
          >
            <option value="">Select a course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.courseCode} - {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Block Selection */}
        {selectedCourse && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Block/Module <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.blockId}
              onChange={(e) => setFormData({ ...formData, blockId: e.target.value })}
              className="input"
            >
              <option value="">Select a block</option>
              {selectedCourse.blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  Block {b.order}: {b.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Material Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Introduction to Home Care"
            className="input"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Material Type <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.type}
            onChange={(e) =>
              setFormData({
                ...formData,
                type: e.target.value as "VIDEO" | "NOTES" | "QUIZ",
              })
            }
            className="input"
          >
            <option value="NOTES">Notes/PDF</option>
            <option value="VIDEO">Video</option>
            <option value="QUIZ">Quiz</option>
          </select>
        </div>

        {/* Type-specific fields */}
        {formData.type === "VIDEO" && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">
                Bunny Video ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.bunnyVideoId}
                onChange={(e) => setFormData({ ...formData, bunnyVideoId: e.target.value })}
                placeholder="Enter Bunny Stream video GUID"
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload video to Bunny Stream first, then paste the video ID here
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Duration (seconds)
              </label>
              <input
                type="number"
                value={formData.durationSec}
                onChange={(e) => setFormData({ ...formData, durationSec: e.target.value })}
                placeholder="e.g., 300 for 5 minutes"
                className="input"
              />
            </div>
          </>
        )}

        {formData.type === "NOTES" && (
          <div>
            <label className="block text-sm font-medium mb-2">
              S3 Key/Path <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.notesS3Key}
              onChange={(e) => setFormData({ ...formData, notesS3Key: e.target.value })}
              placeholder="e.g., materials/course-notes.pdf"
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload PDF/document to S3 first, then paste the key here
            </p>
          </div>
        )}

        {/* Transcript */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Transcript/Description
          </label>
          <textarea
            value={formData.transcript}
            onChange={(e) => setFormData({ ...formData, transcript: e.target.value })}
            placeholder="Optional transcript or description for searchability"
            rows={4}
            className="input"
          />
        </div>

        {/* Free Preview */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="freePreview"
            checked={formData.isFreePreview}
            onChange={(e) => setFormData({ ...formData, isFreePreview: e.target.checked })}
            className="checkbox"
          />
          <label htmlFor="freePreview" className="text-sm">
            Make this a free preview (visible to non-enrolled students)
          </label>
        </div>

        {/* Notice */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-200 mb-2">
            📘 Protected Materials
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            All materials are streamed within the platform only. Students cannot download videos or PDFs.
            Files must be uploaded to Bunny Stream (videos) or S3 (documents) before adding them here.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Uploading..." : "Upload Material"}
          </button>
          <Link href="/principal/materials" className="btn-secondary no-underline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
