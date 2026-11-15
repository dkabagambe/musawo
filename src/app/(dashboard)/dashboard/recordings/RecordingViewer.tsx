"use client";

import { useState } from "react";

function embedUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
    if (url.hostname.endsWith("youtube.com") && url.pathname === "/watch") return `https://www.youtube-nocookie.com/embed/${url.searchParams.get("v") ?? ""}`;
    return value;
  } catch { return value; }
}

function isExternalLink(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.includes("meet.google.com") || u.hostname.includes("drive.google.com");
  } catch { return false; }
}

export default function RecordingViewer({
  title,
  url,
  studentName,
  studentNumber,
}: {
  title: string;
  url: string;
  studentName: string;
  studentNumber: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const external = isExternalLink(url);

  function handleSpeedChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const speed = parseFloat(e.target.value);
    setPlaybackSpeed(speed);
    // Apply to YouTube iframe via postMessage (works for YouTube embeds)
    const iframe = document.querySelector<HTMLIFrameElement>(`iframe[title="${title}"]`);
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "setPlaybackRate", args: [speed] }),
        "*",
      );
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
        <iframe
          title={title}
          src={embedUrl(url)}
          className="absolute inset-0 h-full w-full"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
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

      <div className="space-y-1">
        <p className="text-xs text-gray-500">
          This replay is provided for your learning. The viewer adds a name watermark.
          Screenshots and external provider sharing cannot be fully prevented.
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
