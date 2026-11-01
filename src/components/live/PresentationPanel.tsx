"use client";

/**
 * PresentationPanel (instructor view)
 *
 * Lets the instructor upload slides or a PDF to the class presentation panel.
 * Students see these in-platform with no download link.
 * Only PDF, PPT, PPTX, PNG, JPG, WEBP are accepted (max 50 MB).
 */

import { useEffect, useRef, useState } from "react";
import { Upload, Trash2, FileText, Loader2 } from "lucide-react";

interface Presentation {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  order: number;
  createdAt: string;
  viewUrl: string;
}

const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/webp",
];

function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PresentationPanel({ classId }: { classId: string }) {
  const [items, setItems]     = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/live-classes/${classId}/presentation`);
      if (res.ok) {
        const data = await res.json() as { presentations: Presentation[] };
        setItems(data.presentations);
      }
    } catch { /* keep last state */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [classId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFile(file: File) {
    if (!ALLOWED_MIME.includes(file.type)) {
      setMessage("File type not allowed. Use PDF, PPT, PPTX or an image.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setMessage("File is too large. Maximum 50 MB.");
      return;
    }
    setMessage("");
    setUploading(true);
    try {
      // Step 1: request presigned URL
      const res = await fetch(`/api/live-classes/${classId}/presentation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, sizeBytes: file.size }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setMessage(d.error ?? "Could not start upload.");
        return;
      }
      const { uploadUrl } = await res.json() as { uploadUrl: string };

      // Step 2: PUT to presigned URL
      const put = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!put.ok) {
        setMessage("Upload failed. Please try again.");
        return;
      }

      setMessage("Presentation uploaded.");
      await load();
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this presentation from the class?")) return;
    const res = await fetch(
      `/api/live-classes/${classId}/presentation?presentationId=${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setItems((prev) => prev.filter((p) => p.id !== id));
      setMessage("Removed.");
    } else {
      setMessage("Could not remove the presentation.");
    }
  }

  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm">Presentation panel</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Slides or PDFs shown to students in-platform only. No download link is ever served.
          </p>
        </div>
        <label className="btn-outline text-xs cursor-pointer flex items-center gap-1.5">
          {uploading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Uploading…</>
          ) : (
            <><Upload className="w-3.5 h-3.5" aria-hidden="true" /> Upload file</>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.ppt,.pptx,.png,.jpg,.jpeg,.webp"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
          />
        </label>
      </div>

      {message && (
        <p role="status" className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          {message}
        </p>
      )}

      {loading ? (
        <p className="text-xs text-gray-400 py-2">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">No presentations uploaded yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5">
              <FileText className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
              <span className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">{p.fileName}</span>
                <span className="text-xs text-gray-400">{fmt(p.sizeBytes)}</span>
              </span>
              <a
                href={p.viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline text-xs no-underline"
              >
                Preview
              </a>
              <button
                type="button"
                className="text-danger hover:text-red-700 transition-colors"
                aria-label={`Remove ${p.fileName}`}
                onClick={() => void handleDelete(p.id)}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
