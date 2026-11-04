"use client";

/**
 * AvatarUpload
 *
 * Reusable profile photo upload widget.
 * Works for every role — just drop it into any profile page.
 *
 * Uploads to POST /api/profile/avatar (multipart/form-data, field "avatar").
 * The API resizes the image to 256×256, stores it in S3, and updates
 * avatarUrl on the User record. The photo is served via
 * GET /api/profile/avatar/{userId} to keep S3 keys private.
 *
 * Props:
 *   userId    — current user's ID (used to build the image URL)
 *   avatarUrl — initial value from the DB (can be null)
 *   size      — "sm" (36px) | "md" (56px, default) | "lg" (96px)
 *   name      — user's display name (used for the fallback initial)
 */

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, X } from "lucide-react";

interface AvatarUploadProps {
  userId: string;
  avatarUrl?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { outer: "w-10 h-10", text: "text-base", icon: 14, badge: "w-5 h-5 -bottom-0.5 -right-0.5" },
  md: { outer: "w-14 h-14", text: "text-xl",   icon: 16, badge: "w-6 h-6 -bottom-0.5 -right-0.5" },
  lg: { outer: "w-24 h-24", text: "text-3xl",  icon: 20, badge: "w-8 h-8 -bottom-1 -right-1" },
};

export default function AvatarUpload({ avatarUrl, name, size = "md" }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(avatarUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const sz = SIZES[size];
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  async function handleFile(file: File) {
    if (!file) return;
    setError("");
    setUploading(true);

    // Local preview while uploading
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    const form = new FormData();
    form.append("avatar", file);

    try {
      const res = await fetch("/api/profile/avatar", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        setPreview(avatarUrl ?? null); // revert to old photo
      } else {
        // Force-bust the browser cache by appending a timestamp
        setPreview(`${data.avatarUrl}?t=${Date.now()}`);
      }
    } catch {
      setError("Network error. Please try again.");
      setPreview(avatarUrl ?? null);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localUrl);
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Avatar circle */}
      <div
        className="relative group cursor-pointer select-none"
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        title="Click to change photo"
        role="button"
        tabIndex={0}
        aria-label="Upload profile photo"
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      >
        <div className={`${sz.outer} rounded-full overflow-hidden bg-primary flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-md`}>
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
              : <Camera size={sz.icon} className="text-white" />
            }
          </div>
        </div>

        {/* Camera badge */}
        {!uploading && (
          <span className={`absolute ${sz.badge} bg-accent rounded-full flex items-center justify-center shadow-sm border-2 border-white pointer-events-none`}>
            <Camera size={sz.icon - 6} className="text-white" />
          </span>
        )}
      </div>

      {/* Caption */}
      <p className="text-xs text-gray-400">Click to upload photo</p>

      {/* Error */}
      {error && (
        <div role="alert" className="flex items-center gap-1.5 text-xs text-danger bg-danger/10 rounded-lg px-3 py-1.5">
          <X size={12} />
          {error}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        aria-hidden="true"
        onChange={onChange}
      />
    </div>
  );
}
