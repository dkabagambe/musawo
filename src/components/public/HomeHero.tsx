"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";

/* ─── Slide data ────────────────────────────────────────────── */
const SLIDES = [
  {
    id: 1,
    src: "/assets/images/hero-training.jpg",
    alt: "Nursing care assistant in a clinical setting at Musawo Training Center skills lab",
    pos: "right 20%",
  },
  {
    id: 2,
    src: "/assets/images/musawo-session.webp",
    alt: "Musawo Training Center students in a hands-on practical training session",
    pos: "center 30%",
  },
  {
    id: 3,
    src: "/assets/images/graduates-clinic.jpg",
    alt: "Musawo Training Center graduates working in a clinical environment",
    pos: "center 25%",
  },
];

const HOLD_MS = 5000;
const FADE_MS = 700;

/* ─── Hero card ─────────────────────────────────────────────── */
function HeroCard({ intakeLabel }: { intakeLabel?: string }) {
  const label = intakeLabel ?? "November 2026 intake";
  return (
    <div
      className="rounded-2xl px-7 py-8 sm:px-9 sm:py-10"
      style={{
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <p
        className="font-bold uppercase tracking-widest mb-5"
        style={{ fontSize: "10px", color: "#FFB200", letterSpacing: "0.13em" }}
      >
        Now enrolling: {label}
      </p>

      <h1
        className="font-extrabold text-white text-balance mb-4"
        style={{
          fontSize: "clamp(1.375rem, 2.4vw, 2rem)",
          lineHeight: 1.15,
          textShadow: "0 2px 12px rgba(0,0,0,0.3)",
        }}
      >
        Train to become a{" "}
        <span style={{ color: "#FFB200" }}>certified healthcare professional</span>
      </h1>

      <p
        className="mb-6"
        style={{
          fontSize: "clamp(0.8125rem, 1.1vw, 0.9375rem)",
          color: "rgba(255,255,255,0.85)",
          lineHeight: 1.6,
        }}
      >
        Hybrid and online classes with 70% hands-on practicals in our skills lab.
        Taught by doctors, nurses and clinicians.
      </p>

      <div className="flex flex-col xs:flex-row gap-3">
        <Link
          href="/apply"
          className="inline-flex items-center justify-center gap-2 font-bold
                     text-white no-underline active:scale-[0.97] transition-all whitespace-nowrap"
          style={{ backgroundColor: "#FF9F1C", borderRadius: "10px", padding: "11px 20px", fontSize: "13.5px" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#e8900a"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#FF9F1C"; }}
        >
          Apply now <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        </Link>

        <Link
          href="/courses"
          className="inline-flex items-center justify-center gap-2 font-semibold
                     text-white no-underline active:scale-[0.97] transition-all whitespace-nowrap"
          style={{ backgroundColor: "transparent", border: "1.5px solid rgba(255,255,255,0.65)", borderRadius: "10px", padding: "11px 20px", fontSize: "13.5px" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.12)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
        >
          <BookOpen className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          Browse courses
        </Link>
      </div>

      <p
        className="mt-5"
        style={{
          fontSize: "10.5px",
          color: "rgba(255,255,255,0.48)",
          borderTop: "1px solid rgba(255,255,255,0.12)",
          paddingTop: "12px",
        }}
      >
        Digital certificate with QR verification
      </p>
    </div>
  );
}

interface HomeHeroProps {
  intakeLabel?: string;
}

export default function HomeHero({ intakeLabel }: HomeHeroProps) {
  const [idx, setIdx]       = useState(0);
  const [loaded, setLoaded] = useState<boolean[]>([false, false, false]);
  const reduced             = useReducedMotion();
  const timerRef            = useRef<ReturnType<typeof setInterval> | null>(null);

  const advance = useCallback(() => {
    setIdx((p) => (p + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (reduced) return;
    timerRef.current = setInterval(advance, HOLD_MS + FADE_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [reduced, advance]);

  const markLoaded = useCallback((i: number) => {
    setLoaded((prev) => {
      if (prev[i]) return prev;
      const next = [...prev];
      next[i] = true;
      return next;
    });
  }, []);

  const slide = SLIDES[idx];

  return (
    <section
      className="hero-section relative overflow-hidden w-full"
      aria-label="Welcome to Musawo Training Center"
      style={{ backgroundColor: "#0c2c3a" }}
    >
      {SLIDES.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0"
          style={{
            opacity: i === idx ? 1 : 0,
            transition: reduced ? "none" : `opacity ${FADE_MS}ms ease-in-out`,
            zIndex: i === idx ? 1 : 0,
          }}
          aria-hidden="true"
        >
          {/* Ken-Burns zoom wrapper */}
          <div
            className="absolute inset-0"
            style={{
              transform: i === idx && !reduced ? "scale(1.05)" : "scale(1)",
              transition: reduced ? "none" : `transform ${HOLD_MS + FADE_MS}ms linear`,
            }}
          >
            {i === 0 ? (
              /*
               * Slide 1 — use next/image with priority so it is preloaded in
               * <head> and serves as the LCP element.
               */
              <Image
                src={s.src}
                alt={s.alt}
                fill
                priority
                quality={80}
                sizes="100vw"
                className="object-cover"
                style={{ objectPosition: s.pos }}
                onLoad={() => markLoaded(0)}
              />
            ) : (
              /*
               * Slides 2 & 3 — plain <img> tags.
               *
               * Why not next/image here?
               * next/image with priority={false} silently adds loading="lazy"
               * on fill images. Inside an opacity:0 positioned container the
               * browser cannot measure the element's intersection and the lazy
               * load never fires — the image just never loads.
               *
               * A plain <img> with fetchPriority="low" loads eagerly in the
               * background without competing with the LCP image, solving the
               * problem completely.
               *
               * The src goes directly to the static file in /public/assets/
               * (no /_next/image optimization needed — the files are already
               * compressed WebPs/JPEGs under 100 KB).
               */
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.src}
                alt={s.alt}
                fetchPriority="low"
                decoding="async"
                onLoad={() => markLoaded(i)}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: s.pos,
                  // Keep the dark background showing until the image is loaded
                  opacity: loaded[i] ? 1 : 0,
                  transition: "opacity 0.3s ease",
                }}
              />
            )}
          </div>

          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 90% 80% at 50% 60%, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.28) 70%, rgba(0,0,0,0.08) 100%)",
            }}
          />
        </div>
      ))}

      {/* Mobile + tablet: centred */}
      <div
        className="absolute inset-0 flex items-center justify-center px-5 sm:px-10 lg:hidden"
        style={{ zIndex: 10 }}
      >
        <AnimatePresence mode="wait">
          <m.div
            key={`card-sm-${slide.id}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ maxWidth: "440px", width: "100%" }}
          >
            <HeroCard intakeLabel={intakeLabel} />
          </m.div>
        </AnimatePresence>
      </div>

      {/* Desktop: 20% from left */}
      <div
        className="absolute inset-0 hidden lg:flex items-center"
        style={{ paddingLeft: "clamp(48px, 20vw, 360px)", zIndex: 10 }}
      >
        <AnimatePresence mode="wait">
          <m.div
            key={`card-lg-${slide.id}`}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ maxWidth: "440px", width: "100%" }}
          >
            <HeroCard intakeLabel={intakeLabel} />
          </m.div>
        </AnimatePresence>
      </div>

      {/* Slide indicator dots */}
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2"
        style={{ zIndex: 10 }}
        role="tablist"
        aria-label="Slide indicators"
      >
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === idx}
            aria-label={`Slide ${i + 1}`}
            onClick={() => setIdx(i)}
            className="transition-all duration-300 rounded-full focus-visible:outline-2
                       focus-visible:outline-offset-2 focus-visible:outline-white"
            style={{
              width: i === idx ? 28 : 8,
              height: 8,
              backgroundColor: i === idx ? "#FFB200" : "rgba(255,255,255,0.45)",
            }}
          />
        ))}
      </div>
    </section>
  );
}
