'use client';

import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  /** e.g. "87+", "1,000+", "3" */
  value: string;
  className?: string;
}

function parseValue(raw: string): { num: number; suffix: string } {
  // Extract leading number (may contain commas)
  const match = raw.match(/^([\d,]+)(.*)/);
  if (!match) return { num: 0, suffix: raw };
  const num = parseInt(match[1].replace(/,/g, ''), 10);
  const suffix = match[2] ?? '';
  return { num, suffix };
}

function formatNumber(n: number, originalHadCommas: boolean): string {
  if (originalHadCommas) return n.toLocaleString('en-US');
  return String(n);
}

export default function CountUp({ value, className }: CountUpProps) {
  const { num: target, suffix } = parseValue(value);
  const originalHadCommas = value.includes(',');

  // Respect prefers-reduced-motion
  const prefersReduced =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const [count, setCount] = useState(prefersReduced ? target : 0);
  const [started, setStarted] = useState(prefersReduced);
  const ref = useRef<HTMLSpanElement>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReduced) { setCount(target); return; }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => { observer.disconnect(); };
  }, [prefersReduced, target]);

  useEffect(() => {
    if (!started || prefersReduced) return;

    const duration = 1200; // ms
    const startTime = performance.now();
    const startVal = 0;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(startVal + eased * (target - startVal)));
      if (progress < 1) {
        raf.current = requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [started, target, prefersReduced]);

  return (
    <span ref={ref} className={className} suppressHydrationWarning>
      {formatNumber(count, originalHadCommas)}{suffix}
    </span>
  );
}
