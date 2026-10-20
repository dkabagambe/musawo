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

export default function RecordingViewer({ title, url, studentName, studentNumber }: { title: string; url: string; studentName: string; studentNumber: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <section className="card space-y-3" onContextMenu={(event) => event.preventDefault()} onMouseLeave={() => setMenuOpen(false)}>
    <h2 className="font-semibold">{title}</h2>
    <div className="relative aspect-video overflow-hidden rounded-xl bg-black" onContextMenu={(event) => event.preventDefault()}>
      <iframe title={title} src={embedUrl(url)} className="absolute inset-0 h-full w-full" referrerPolicy="strict-origin-when-cross-origin" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-25"><span className="rotate-[-24deg] text-center text-lg font-semibold text-white drop-shadow">{studentName}<br />{studentNumber}</span></div>
      <button aria-label="Recording options" type="button" className="absolute right-2 top-2 h-8 w-8 rounded-full bg-black/40 text-white" onClick={() => setMenuOpen(!menuOpen)}>⋮</button>
      {menuOpen && <div className="absolute right-2 top-10 rounded-lg bg-white p-3 text-xs shadow">Watch inside Musawo. Screenshots cannot be fully prevented.</div>}
    </div>
    <p className="text-xs text-gray-500">This replay is provided for your learning. The viewer adds a name watermark. Screenshots and external provider sharing cannot be fully prevented.</p>
  </section>;
}
