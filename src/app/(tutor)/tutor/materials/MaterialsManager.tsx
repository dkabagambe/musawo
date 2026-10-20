"use client";

import { useState } from "react";
import { FileText, Video, Upload, Lock, Eye, EyeOff, Clock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface Course {
  id: string;
  title: string;
  slug: string;
  blocks: Array<{
    id: string;
    title: string;
    order: number;
    lessons: Array<{
      id: string;
      title: string;
      type: string;
      notesS3Key: string | null;
      bunnyVideoId: string | null;
      isFree: boolean;
      isFreePreview: boolean;
      durationSec: number | null;
    }>;
  }>;
}

export default function MaterialsManager({ courses }: { courses: Course[] }) {
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id ?? "");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadType, setUploadType] = useState<"NOTES" | "VIDEO">("NOTES");
  const [fileName, setFileName] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [blockId, setBlockId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!lessonTitle.trim()) { setError("Lesson title is required."); return; }

    if (uploadType === "NOTES" && !fileName.trim()) { setError("Select a file to upload."); return; }
    if (uploadType === "VIDEO" && !videoUrl.trim()) { setError("Enter a Bunny Stream video ID or URL."); return; }

    setUploading(true);
    try {
      if (uploadType === "NOTES") {
        // Step 1: get presigned upload URL
        const fileInput = document.getElementById("fileInput") as HTMLInputElement;
        const file = fileInput?.files?.[0];
        if (!file) { setError("Select a file."); setUploading(false); return; }

        const res = await fetch("/api/tutor/materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type || "application/pdf",
            fileSize: file.size,
            courseId: selectedCourseId,
            blockId: blockId || undefined,
            lessonTitle,
            lessonType: "NOTES",
          }),
        });

        if (!res.ok) {
          const d = await res.json();
          setError(d.error ?? "Failed to prepare upload.");
          setUploading(false);
          return;
        }

        const { uploadUrl, s3Key, lessonId } = await res.json();

        // Step 2: upload file to S3
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/pdf" },
          body: file,
        });

        if (!putRes.ok) { setError("File upload failed. Please try again."); setUploading(false); return; }

        // Step 3: confirm upload and update lesson
        const confirmRes = await fetch("/api/tutor/materials", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId, s3Key, durationSec: 600 }),
        });

        if (!confirmRes.ok) { setError("Upload succeeded but could not update the lesson. Contact IT."); setUploading(false); return; }

        setSuccess(`"${lessonTitle}" uploaded successfully.`);
      } else {
        // Video link: just create the lesson with the Bunny video ID
        const bunnyId = videoUrl.trim().replace(/^https?:\/\/.*\//, "").split("?")[0];

        const res = await fetch("/api/tutor/materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: "video",
            contentType: "video/mp4",
            courseId: selectedCourseId,
            blockId: blockId || undefined,
            lessonTitle,
            lessonType: "VIDEO",
          }),
        });

        if (!res.ok) {
          const d = await res.json();
          setError(d.error ?? "Failed to create video lesson.");
          setUploading(false);
          return;
        }

        const { lessonId } = await res.json();

        // Update with Bunny video ID
        const patchRes = await fetch("/api/tutor/materials", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId, bunnyVideoId: bunnyId, durationSec: 1800 }),
        });

        if (!patchRes.ok) { setError("Could not link the video. The lesson was created but has no video."); setUploading(false); return; }

        setSuccess(`"${lessonTitle}" video linked successfully.`);
      }

      setShowUpload(false);
      setLessonTitle("");
      setFileName("");
      setVideoUrl("");
      setBlockId("");
      // Refresh the page to show new material
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function togglePreview(lessonId: string, current: boolean) {
    setTogglingId(lessonId);
    try {
      const res = await fetch("/api/tutor/materials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, isFreePreview: !current }),
      });
      if (res.ok) window.location.reload();
    } catch {
      // ignore
    } finally {
      setTogglingId(null);
    }
  }

  const totalLessons = selectedCourse?.blocks.reduce((s, b) => s + b.lessons.length, 0) ?? 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Materials</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload PDFs, notes, slides and videos for your courses. Students can only view them online (no downloads).
          </p>
        </div>
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {showUpload ? "Cancel" : "Upload material"}
        </button>
      </div>

      {/* Course selector */}
      <div className="flex flex-wrap gap-2">
        {courses.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCourseId(c.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium no-underline transition-colors ${
              c.id === selectedCourseId
                ? "bg-primary text-white"
                : "bg-white border border-border text-gray-600 hover:bg-surface"
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="font-bold text-primary mb-4">Upload new material</h2>
          {error && (
            <div className="bg-danger/5 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
          <form onSubmit={handleUpload} className="space-y-4">
            {/* Type toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUploadType("NOTES")}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border-2 transition-colors ${
                  uploadType === "NOTES" ? "border-primary bg-primary/5 text-primary" : "border-border text-gray-500"
                }`}
              >
                <FileText className="w-5 h-5 mx-auto mb-1" />
                PDF / Notes / Slides
              </button>
              <button
                type="button"
                onClick={() => setUploadType("VIDEO")}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border-2 transition-colors ${
                  uploadType === "VIDEO" ? "border-primary bg-primary/5 text-primary" : "border-border text-gray-500"
                }`}
              >
                <Video className="w-5 h-5 mx-auto mb-1" />
                Video (Bunny Stream)
              </button>
            </div>

            {/* Lesson title */}
            <div>
              <label className="label" htmlFor="lessonTitle">Lesson title</label>
              <input
                id="lessonTitle"
                type="text"
                required
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                className="input"
                placeholder="e.g. Introduction to Infection Control"
              />
            </div>

            {/* Block selector */}
            <div>
              <label className="label" htmlFor="blockId">Block (optional)</label>
              <select
                id="blockId"
                value={blockId}
                onChange={(e) => setBlockId(e.target.value)}
                className="input"
              >
                <option value="">Auto-create a block</option>
                {selectedCourse?.blocks.map((b) => (
                  <option key={b.id} value={b.id}>Block {b.order}: {b.title}</option>
                ))}
              </select>
            </div>

            {/* File input or video URL */}
            {uploadType === "NOTES" ? (
              <div>
                <label className="label" htmlFor="fileInput">PDF, DOCX, PPTX or image file</label>
                <input
                  id="fileInput"
                  type="file"
                  accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                  className="input file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-primary file:text-white file:text-sm file:font-medium"
                />
                <p className="text-xs text-gray-400 mt-1">Max 50 MB. Students will view this in-browser with a watermark (no download).</p>
              </div>
            ) : (
              <div>
                <label className="label" htmlFor="videoUrl">Bunny Stream video ID or URL</label>
                <input
                  id="videoUrl"
                  type="text"
                  required
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="input"
                  placeholder="e.g. abc123def456 or https://iframe.mediadelivery.net/embed/12345/abc123"
                />
                <p className="text-xs text-gray-400 mt-1">Videos stream inside the platform with no download link. External links are flagged as shareable.</p>
              </div>
            )}

            <button type="submit" disabled={uploading} className="btn-primary text-sm flex items-center gap-2">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Uploading..." : "Upload and publish"}
            </button>
          </form>
          {success && (
            <div className="bg-success/5 border border-success/20 text-success text-sm rounded-xl px-4 py-3 mt-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {success}
            </div>
          )}
        </div>
      )}

      {/* Materials list */}
      {selectedCourse && (
        <div className="space-y-4">
          {selectedCourse.blocks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border p-12 text-center">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No materials uploaded for this course yet.</p>
              <button onClick={() => setShowUpload(true)} className="text-xs text-accent font-semibold mt-2">
                Upload your first material
              </button>
            </div>
          ) : (
            selectedCourse.blocks.map((block) => (
              <div key={block.id} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border bg-surface/50 flex items-center justify-between">
                  <h3 className="font-bold text-primary text-sm">Block {block.order}: {block.title}</h3>
                  <span className="text-xs text-gray-400">{block.lessons.length} item{block.lessons.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="divide-y divide-border">
                  {block.lessons.map((lesson) => (
                    <div key={lesson.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface/30 transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        lesson.type === "VIDEO" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
                      }`}>
                        {lesson.type === "VIDEO" ? <Video className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary truncate">{lesson.title}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          {lesson.type === "VIDEO" ? (
                            <span className="flex items-center gap-1"><Video className="w-3 h-3" /> Video</span>
                          ) : lesson.notesS3Key ? (
                            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-success" /> Uploaded</span>
                          ) : (
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pending upload</span>
                          )}
                          {lesson.durationSec && (
                            <span>{Math.floor(lesson.durationSec / 60)} min</span>
                          )}
                          {lesson.isFreePreview ? (
                            <span className="flex items-center gap-1 text-success"><Eye className="w-3 h-3" /> Free preview</span>
                          ) : (
                            <span className="flex items-center gap-1 text-gray-400"><Lock className="w-3 h-3" /> Enrolled only</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => togglePreview(lesson.id, lesson.isFreePreview)}
                        disabled={togglingId === lesson.id}
                        className="text-xs text-gray-500 hover:text-primary px-3 py-1.5 rounded-lg border border-border hover:bg-surface transition-colors flex-shrink-0"
                      >
                        {togglingId === lesson.id ? "..." : lesson.isFreePreview ? "Hide preview" : "Make preview"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {courses.length === 0 && (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">You are not assigned to any published courses yet.</p>
        </div>
      )}
    </div>
  );
}
