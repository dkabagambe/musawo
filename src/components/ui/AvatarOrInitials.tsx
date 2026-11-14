"use client";

import Image from "next/image";
import { getInitials } from "@/lib/utils/initials";

interface AvatarOrInitialsProps {
  name: string;
  avatarUrl?: string | null;
  size?: number; // pixels, default 40
  className?: string;
}

/** Colour classes cycled based on name hash. */
const TONE_CLASSES = [
  "bg-primary/20 text-primary",
  "bg-accent/20 text-accent",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
];

function toneFor(name: string) {
  const idx =
    Array.from(name.toLowerCase()).reduce((t, c) => t + c.charCodeAt(0), 0) %
    TONE_CLASSES.length;
  return TONE_CLASSES[idx];
}

export default function AvatarOrInitials({
  name,
  avatarUrl,
  size = 40,
  className = "",
}: AvatarOrInitialsProps) {
  const initials = getInitials(name);
  const tone = toneFor(name);
  const fontSize = Math.max(10, Math.round(size * 0.35));

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 ${
        avatarUrl ? "" : tone
      } ${className}`}
      style={{ width: size, height: size, fontSize }}
      aria-hidden="true"
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={name}
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      ) : (
        <span className="font-semibold leading-none select-none">{initials}</span>
      )}
    </span>
  );
}
