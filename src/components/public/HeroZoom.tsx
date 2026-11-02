"use client";

/**
 * Applies a gentle slow-zoom CSS animation to a hero photo div.
 * This tiny client component is the ONLY reason PageHero ever needed
 * "use client". Keeping it isolated means PageHero itself can be a
 * server component, which ships less JS and renders faster.
 */
import { useEffect, useRef } from "react";

interface Props {
  children: React.ReactNode;
}

export default function HeroZoom({ children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches || !ref.current) return;
    ref.current.style.animation = "heroZoom 12s ease-out forwards";
  }, []);

  return (
    <div ref={ref} className="absolute inset-0 will-change-transform">
      {children}
    </div>
  );
}
