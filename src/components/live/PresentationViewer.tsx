"use client";

/**
 * PresentationViewer (student view)
 *
 * Shows slides and PDFs uploaded by the instructor for a live class.
 * Files are served via presigned URLs that expire (no permanent download links).
 * Context menu is blocked and no download button is shown.
 */

import { useEffect, useState } from "react";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";

interface Presentation {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  viewUrl: string;
}

function isImage(mime: string) {
  return mime.startsWith("image/");
}

function isPdf(mime: string) {
  return mime === "application/pdf";
}

export default function PresentationViewer({ classId }: { classId: string }) {
  const [items, setItems]   = useState<Presentation[]>([]);
  const [index, setIndex]   = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/live-classes/${classId}/presentation`);
        if (res.ok && active) {
          const data = await res.json() as { presentations: Presentation[] };
          setItems(data.presentations);
          setIndex(0);
        }
      } catch { /* keep last state */ }
      finally { if (active) setLoading(false); }
    };
    void load();
    // Refresh every 60 s to pick up new slides (presigned URLs also renew)
    const timer = setInterval(load, 60_000);
    return () => { active = false; clearInterval(timer); };
  }, [classId]);

  if (loading) return <p className="text-xs text-gray-400 py-4 text-center">Loading presentation…</p>;
  if (items.length === 0) return null;

  const current = items[index];
  if (!current) return null;

  return (
    <section
      className="card space-y-3"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
          <span className="text-sm font-semibold truncate">{current.fileName}</span>
        </div>
        {items.length > 1 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              aria-label="Previous"
              disabled={index === 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="text-xs text-gray-500 tabular-nums">{index + 1} / {items.length}</span>
            <button
              type="button"
              aria-label="Next"
              disabled={index === items.length - 1}
              onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
              className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* Viewer frame -- no download, no right-click */}
      <div className="rounded-xl overflow-hidden border border-border bg-gray-50 aspect-[4/3] relative select-none">
        {isPdf(current.mimeType) && (
          <iframe
            title={current.fileName}
            src={`${current.viewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
            className="absolute inset-0 w-full h-full"
            sandbox="allow-same-origin allow-scripts"
          />
        )}
        {isImage(current.mimeType) && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={current.viewUrl}
            alt={current.fileName}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        )}
        {!isPdf(current.mimeType) && !isImage(current.mimeType) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
            <FileText className="w-10 h-10 text-gray-400" aria-hidden="true" />
            <p className="text-sm text-gray-500 text-center">
              {current.fileName}
            </p>
            <p className="text-xs text-gray-400 text-center">
              This file type is viewable only via the preview below.
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Materials are provided for in-class use only.
      </p>
    </section>
  );
}
