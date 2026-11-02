"use client";

import { m, useReducedMotion } from "framer-motion";

interface AnimateInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export default function AnimateIn({ children, delay = 0, className }: AnimateInProps) {
  const reduced = useReducedMotion();

  // When motion is reduced, render without any animation wrapper so the
  // content is immediately visible (no opacity:0 initial state).
  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      // fallbackInView: treat elements as in-view on the server / if the
      // IntersectionObserver is not available, so they are never invisible.
      viewport={{ once: true, margin: "-60px", amount: 0.15 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      suppressHydrationWarning
    >
      {children}
    </m.div>
  );
}
