"use client";

/**
 * AvatarUpload
 *
 * Profile photo upload widget with client-side crop-before-upload.
 *
 * Flow:
 *   1. User clicks the avatar circle (or drags a photo onto it).
 *   2. A modal opens showing the chosen photo inside a circular crop area.
 *   3. The user drags/resizes the crop handle, then clicks "Save photo".
 *   4. The cropped canvas is converted to a Blob and sent to
 *      POST /api/profile/avatar (multipart/form-data, field "avatar").
 *   5. The server (sharp) re-normalises to 256×256 JPEG and stores it in S3.
 *
 * Props:
 *   userId    — current user's ID (used only for the initial img src)
 *   avatarUrl — initial value from the DB (can be null)
 *   size      — "sm" (40px) | "md" (56px, default) | "lg" (96px)
 *   name      — user's display name (fallback initial)
 */

import { useRef, useState, useCallback } from "react";
import Image from "next/image";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Camera, Loader2, X, Check, ZoomIn, ZoomOut } from "lucide-react";

// ── Sizes ────────────────────────────────────────────────────────────────────
interface AvatarUploadProps {
  userId: string;
  avatarUrl?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { outer: "w-10 h-10",  text: "text-base", icon: 14, badge: "w-5 h-5 -bottom-0.5 -right-0.5" },
  md: { outer: "w-14 h-14",  text: "text-xl",   icon: 16, badge: "w-6 h-6 -bottom-0.5 -right-0.5" },
  lg: { outer: "w-24 h-24",  text: "text-3xl",  icon: 20, badge: "w-8 h-8 -bottom-1 -right-1" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Return a centered square crop that fills 90% of the shorter dimension. */
function initialCrop(width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, 1, width, height),
    width,
    height,
  );
}

/**
 * Draw the PixelCrop region of `image` onto an offscreen canvas and return
 * a Blob. The canvas is square at `outputSize` px.
 */
function cropToBlob(
  image: HTMLImageElement,
  crop: PixelCrop,
  outputSize = 512,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width  = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Scale factor between natural image size and displayed size
  const scaleX = image.naturalWidth  / image.width;
  const scaleY = image.naturalHeight / image.height;

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width  * scaleX,
    crop.height * scaleY,
    0, 0,
    outputSize, outputSize,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("toBlob failed")),
      "image/jpeg",
      0.92,
    );
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AvatarUpload({
  avatarUrl,
  name,
  size = "md",
}: AvatarUploadProps) {
  // Displayed avatar (after save)
  const [preview, setPreview] = useState<string | null>(avatarUrl ?? null);

  // Modal state
  const [modalOpen,  setModalOpen]  = useState(false);
  const [srcUrl,     setSrcUrl]     = useState<string>("");   // object URL of picked file
  const [crop,       setCrop]       = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  // Zoom (CSS scale applied to the image inside the cropper)
  const [zoom, setZoom] = useState(1);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState("");

  const inputRef  = useRef<HTMLInputElement>(null);
  const imageRef  = useRef<HTMLImageElement>(null);

  const sz      = SIZES[size];
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  // ── Open file picker ───────────────────────────────────────────────────────
  function openPicker() {
    if (!uploading) inputRef.current?.click();
  }

  // ── File selected → open modal ─────────────────────────────────────────────
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";                      // allow re-selecting same file
    if (!file) return;

    // Revoke previous object URL
    if (srcUrl) URL.revokeObjectURL(srcUrl);

    const url = URL.createObjectURL(file);
    setSrcUrl(url);
    setCrop(undefined);                       // will be set once image loads
    setCompletedCrop(undefined);
    setZoom(1);
    setError("");
    setModalOpen(true);
  }

  // ── Image loaded inside cropper → set initial crop ─────────────────────────
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(initialCrop(width, height));
  }, []);

  // ── Drag-and-drop onto the avatar circle ───────────────────────────────────
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    const url = URL.createObjectURL(file);
    setSrcUrl(url);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setZoom(1);
    setError("");
    setModalOpen(true);
  }

  // ── Cancel / close modal ───────────────────────────────────────────────────
  function closeModal() {
    setModalOpen(false);
    if (srcUrl) { URL.revokeObjectURL(srcUrl); setSrcUrl(""); }
  }

  // ── Save: crop → blob → upload ─────────────────────────────────────────────
  async function handleSave() {
    if (!completedCrop || !imageRef.current) {
      setError("Please adjust the crop area first.");
      return;
    }
    setError("");
    setUploading(true);

    try {
      const blob = await cropToBlob(imageRef.current, completedCrop, 512);
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });

      const form = new FormData();
      form.append("avatar", file);

      const res  = await fetch("/api/profile/avatar", { method: "POST", body: form });
      const data = await res.json() as { avatarUrl?: string; error?: string };

      if (!res.ok) {
        setError(data.error ?? "Upload failed. Please try again.");
      } else {
        setPreview(`${data.avatarUrl}?t=${Date.now()}`);
        closeModal();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Avatar circle (click / drag target) ─────────────────────────── */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="relative group cursor-pointer select-none"
          onClick={openPicker}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          title="Click to change photo"
          role="button"
          tabIndex={0}
          aria-label="Upload profile photo"
          onKeyDown={(e) => e.key === "Enter" && openPicker()}
        >
          <div
            className={`${sz.outer} rounded-full overflow-hidden bg-primary flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-md`}
          >
            {preview ? (
              <Image
                src={preview}
                alt={`${name} profile photo`}
                width={96}
                height={96}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <span className={`text-white font-bold ${sz.text}`} aria-hidden="true">
                {initial}
              </span>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading
                ? <Loader2 size={sz.icon} className="text-white animate-spin" />
                : <Camera  size={sz.icon} className="text-white" />
              }
            </div>
          </div>

          {/* Camera badge */}
          {!uploading && (
            <span
              className={`absolute ${sz.badge} bg-accent rounded-full flex items-center justify-center shadow-sm border-2 border-white pointer-events-none`}
            >
              <Camera size={sz.icon - 6} className="text-white" />
            </span>
          )}
        </div>

        <p className="text-xs text-gray-400">Click to upload photo</p>

        {/* Error shown outside the modal (post-close fallback) */}
        {error && !modalOpen && (
          <div role="alert" className="flex items-center gap-1.5 text-xs text-danger bg-danger/10 rounded-lg px-3 py-1.5">
            <X size={12} aria-hidden="true" />
            {error}
          </div>
        )}
      </div>

      {/* ── Hidden file input ──────────────────────────────────────────────── */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-hidden="true"
        onChange={onFileChange}
      />

      {/* ── Crop modal ─────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Crop your profile photo"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
            aria-hidden="true"
          />

          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-bold text-primary text-base">Crop your photo</h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface text-gray-400 hover:text-primary transition-colors"
                aria-label="Close"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            {/* Crop area */}
            <div className="flex items-center justify-center bg-gray-900 px-4 py-5 min-h-[280px]">
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: "transform 0.15s ease",
                  maxWidth: "100%",
                }}
              >
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                  keepSelection
                  minWidth={60}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imageRef}
                    src={srcUrl}
                    alt="Crop preview"
                    onLoad={onImageLoad}
                    style={{ maxHeight: "340px", maxWidth: "100%", display: "block" }}
                    draggable={false}
                  />
                </ReactCrop>
              </div>
            </div>

            {/* Zoom slider */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-surface">
              <ZoomOut size={14} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
              <input
                type="range"
                min={1}
                max={2.5}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-[var(--color-accent)]"
                aria-label="Zoom"
              />
              <ZoomIn size={14} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="mx-5 mt-3 flex items-center gap-1.5 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2"
              >
                <X size={12} aria-hidden="true" />
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 px-5 py-4">
              <button
                onClick={closeModal}
                disabled={uploading}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-gray-600 hover:bg-surface transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={uploading || !completedCrop}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check size={14} aria-hidden="true" />
                    Save photo
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
