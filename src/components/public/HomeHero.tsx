"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";

/* ─── Slide data ────────────────────────────────────────────── */
// blurDataURL: tiny 8x5 WebP for the blur-up placeholder.
// Generated with: sharp(file).resize(8,5).webp({quality:20}).toBuffer()
const SLIDES = [
  {
    id: 1,
    src: "/assets/images/hero-training.jpg",
    alt: "Nursing care assistant in a clinical setting at Musawo Training Center skills lab",
    pos: "right 20%",
    blur: "data:image/webp;base64,UklGRkIAAABXRUJQVlA4IDYAAACwAQCdASoIAAUABUB8JbACdADyfwfYAPa+jaD2KBd0fMHzB/MEfGAEQCrqMK2YPjhD2dRlYAA=",
  },
  {
    id: 2,
    src: "/assets/images/musawo-session.webp",
    alt: "Musawo Training Center students in a hands-on practical training session",
    pos: "center 30%",
    blur: "data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAADQAQCdASoIAAUABUB8JaACdAD5jGKpzAD1yeuwQ9YSaHH3JiygMMhXjLjY7uTMHAAAAA==",
  },
  {
    id: 3,
    src: "/assets/images/graduates-clinic.jpg",
    alt: "Musawo Training Center graduates working in a clinical environment",
    pos: "center 25%",
    blur: "data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUABUB8JYgCdAEWUO6AVoAA/qihPkmolmnM1/y8oZsGzZHi15t2BL9ItgAA",
  },
];

const HOLD_MS = 5000;
const FADE_MS = 700;

/* ─── Shared card content ──────────────────────────────────── */
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
      {/* Badge */}
      <p
        className="font-bold uppercase tracking-widest mb-5"
        style={{ fontSize: "10px", color: "#FFB200", letterSpacing: "0.13em" }}
      >
        Now enrolling: {label}
      </p>

      {/* H1 */}
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

      {/* Sub-copy */}
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

      {/* Buttons */}
      <div className="flex flex-col xs:flex-row gap-3">
        <Link
          href="/apply"
          className="inline-flex items-center justify-center gap-2 font-bold
                     text-white no-underline active:scale-[0.97] transition-all
                     whitespace-nowrap"
          style={{
            backgroundColor: "#FF9F1C",
            borderRadius: "10px",
            padding: "11px 20px",
            fontSize: "13.5px",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "#e8900a";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "#FF9F1C";
          }}
        >
          Apply now <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        </Link>

        <Link
          href="/courses"
          className="inline-flex items-center justify-center gap-2 font-semibold
                     text-white no-underline active:scale-[0.97] transition-all
                     whitespace-nowrap"
          style={{
            backgroundColor: "transparent",
            border: "1.5px solid rgba(255,255,255,0.65)",
            borderRadius: "10px",
            padding: "11px 20px",
            fontSize: "13.5px",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.12)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
          }}
        >
          <BookOpen className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          Browse courses
        </Link>
      </div>

      {/* Trust line */}
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
  const [idx, setIdx]     = useState(0);
  const [ready, setReady] = useState(false); // prevents flash before first image loads
  const reduced           = useReducedMotion();
  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mark ready after mount so the hero fades in cleanly on hydration
  useEffect(() => { setReady(true); }, []);

  const advance = useCallback(() => {
    setIdx((p) => (p + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (reduced) return;
    timerRef.current = setInterval(advance, HOLD_MS + FADE_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [reduced, advance]);

  const slide = SLIDES[idx];

  return (
    <section
      className="hero-section relative overflow-hidden w-full"
      aria-label="Welcome to Musawo Training Center"
      // Dark background so the blur placeholder blends in before the image loads
      style={{ backgroundColor: "#0c2c3a" }}
    >
      {/* Background photo slides
          - Only slide 0 uses priority (preloaded in <head>)
          - Slides 1+ use loading="lazy" so they are NOT fetched on initial paint
          - All slides use placeholder="blur" so there is no colour-pop before
            the optimised image is delivered by /_next/image              */}
      {SLIDES.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0 will-change-[opacity]"
          style={{
            opacity: ready ? (i === idx ? 1 : 0) : i === 0 ? 1 : 0,
            transition: reduced ? "none" : `opacity ${FADE_MS}ms ease-in-out`,
            zIndex: i === idx ? 1 : 0,
          }}
          aria-hidden="true"
        >
          <div
            className="absolute inset-0"
            style={{
              transform: i === idx && !reduced ? "scale(1.05)" : "scale(1)",
              transition: reduced ? "none" : `transform ${HOLD_MS + FADE_MS}ms linear`,
            }}
          >
            <Image
              src={s.src}
              alt={s.alt}
              fill
              // Slide 0: priority-preloaded in <head> for fast LCP.
              // Slides 1+: NOT priority but still eager — loading="lazy" on
              // fill images inside opacity:0 containers never triggers because
              // the browser can't measure "in view", so they never load.
              priority={i === 0}
              placeholder="blur"
              blurDataURL={s.blur}
              quality={80}
              sizes="100vw"
              className="object-cover"
              style={{ objectPosition: s.pos }}
            />
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
      <div className="absolute inset-0 flex items-center justify-center px-5 sm:px-10 lg:hidden" style={{ zIndex: 10 }}>
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
