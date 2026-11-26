"use client";

import { useState, useEffect, useRef } from "react";

function embedUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
    if (url.hostname.endsWith("youtube.com") && url.pathname === "/watch") return `https://www.youtube-nocookie.com/embed/${url.searchParams.get("v") ?? ""}`;
    return value;
  } catch { return value; }
}

function isYouTube(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "youtu.be" || u.hostname.includes("youtube.com");
  } catch { return false; }
}

function isExternalLink(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.includes("meet.google.com") || u.hostname.includes("drive.google.com");
  } catch { return false; }
}

function isS3Url(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.includes(".s3.") || u.hostname.includes(".amazonaws.com");
  } catch { return false; }
}

export default function RecordingViewer({
  title,
  url,
  classId,
  studentName,
  studentNumber,
}: {
  title: string;
  url: string;
  classId: string;
  studentName: string;
  studentNumber: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isWatched, setIsWatched] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const external = isExternalLink(url);
  const isYT = isYouTube(url);
  const isS3 = isS3Url(url);
  const savePositionInterval = useRef<NodeJS.Timeout | null>(null);

  // Load saved playback position and watched status on mount
  useEffect(() => {
    const loadPlaybackState = async () => {
      try {
        const response = await fetch(`/api/recordings/${classId}/position`);
        if (response.ok) {
          const data = await response.json();
          if (data.position && videoRef.current) {
            videoRef.current.currentTime = data.position;
          }
          setIsWatched(data.isWatched ?? false);
        }
      } catch (error) {
        console.error("Failed to load playback state:", error);
      }
    };

    if (isS3) {
      loadPlaybackState();
    }
  }, [classId, isS3]);

  // Save playback position periodically
  useEffect(() => {
    if (!isS3) return;

    const savePosition = async () => {
      if (videoRef.current) {
        try {
          await fetch(`/api/recordings/${classId}/position`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position: Math.floor(videoRef.current.currentTime) }),
          });
        } catch (error) {
          console.error("Failed to save playback position:", error);
        }
      }
    };

    // Save position every 5 seconds
    savePositionInterval.current = setInterval(savePosition, 5000);

    return () => {
      if (savePositionInterval.current) {
        clearInterval(savePositionInterval.current);
      }
    };
  }, [classId, isS3]);

  function handleSpeedChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const speed = parseFloat(e.target.value);
    setPlaybackSpeed(speed);

    if (isS3 && videoRef.current) {
      // For S3 video element, set playbackRate directly
      videoRef.current.playbackRate = speed;
    } else if (isYT && iframeRef.current && iframeRef.current.contentWindow) {
      // For YouTube iframe via postMessage
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "setPlaybackRate", args: [speed] }),
        "*",
      );
    }
  }

  async function handleMarkWatched() {
    try {
      const response = await fetch(`/api/recordings/${classId}/watched`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watched: !isWatched }),
      });
      if (response.ok) {
        const data = await response.json();
        setIsWatched(data.isWatched);
      }
    } catch (error) {
      console.error("Failed to update watched status:", error);
    }
  }

  return (
    <section
      className="card space-y-3"
      onContextMenu={(e) => e.preventDefault()}
      onMouseLeave={() => setMenuOpen(false)}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          {/* Playback speed */}
          <select
            value={playbackSpeed}
            onChange={handleSpeedChange}
            className="text-xs rounded-lg border border-border bg-white dark:bg-gray-800 px-2 py-1 text-gray-600 dark:text-gray-300 focus:outline-none"
            aria-label="Playback speed"
          >
            <option value="0.75">0.75x</option>
            <option value="1">1x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
          <button
            aria-label="Recording options"
            type="button"
            className="h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center text-sm"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            &#9583;
          </button>
        </div>
      </div>

      <div
        className="relative aspect-video overflow-hidden rounded-xl bg-black"
        onContextMenu={(e) => e.preventDefault()}
      >
        {isS3 ? (
          // For S3 URLs, use HTML5 video element (supports playback speed and resume position)
          <video
            ref={videoRef}
            controls
            className="absolute inset-0 h-full w-full"
            controlsList="nodownload"
            crossOrigin="anonymous"
          >
            <source src={url} />
            Your browser does not support the video tag.
          </video>
        ) : (
          // For YouTube and other embeds, use iframe
          <iframe
            ref={iframeRef}
            title={title}
            src={embedUrl(url)}
            className="absolute inset-0 h-full w-full"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        )}
        {/* Watermark */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-25">
          <span className="rotate-[-24deg] text-center text-lg font-semibold text-white drop-shadow">
            {studentName}
            <br />
            {studentNumber}
          </span>
        </div>
        {menuOpen && (
          <div className="absolute right-2 top-10 rounded-lg bg-white p-3 text-xs shadow z-10">
            Watch inside Musawo. Screenshots cannot be fully prevented.
          </div>
        )}
      </div>

      {/* Mark as watched checkbox - only for S3 URLs */}
      {isS3 && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isWatched}
            onChange={handleMarkWatched}
            className="rounded border-gray-300 cursor-pointer"
            aria-label="Mark as watched"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Mark as watched
          </span>
        </label>
      )}

      <div className="space-y-1">
        <p className="text-xs text-gray-500">
          This replay is provided for your learning. The viewer adds a name watermark.
          {isS3 ? " Your playback position is automatically saved." : " Screenshots and external provider sharing cannot be fully prevented."}
        </p>
        {external && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            This is an external link. External links can be shared by anyone who has them.
          </p>
        )}
      </div>
    </section>
  );
}
