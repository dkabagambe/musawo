"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { m, LazyMotion, domAnimation, AnimatePresence, useReducedMotion } from "framer-motion";

/* ─── Slide data ────────────────────────────────────────────── */
const SLIDES = [
  {
    id: 1,
    src: "/assets/images/hero-training.jpg",
    alt: "Nursing care assistant in a clinical setting at Musawo Training Center",
    pos: "right 20%",
  },
  {
    id: 2,
    src: "/assets/images/graduates-field.webp",
    alt: "Musawo Training Center graduates working in the community",
    pos: "center 30%",
  },
];

const HOLD_MS = 5500;
const FADE_MS = 1200;

/* ─── Shared card content ──────────────────────────────────── */
function HeroCard() {
  return (
    <div
      className="rounded-2xl px-7 py-8 sm:px-9 sm:py-10"
      style={{
        background: "rgba(0,0,0,0.42)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      {/* Badge */}
      <p
        className="font-bold uppercase tracking-widest mb-5"
        style={{ fontSize: "10px", color: "#FFB200", letterSpacing: "0.13em" }}
      >
        ▪ Now enrolling - January 2027 intake
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
        Train to become a certified{" "}
        <span style={{ color: "#FFB200" }}>community health worker</span>
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
        Accredited online courses in nursing care and child safety.
        Study on your phone, pay with mobile money.
      </p>

      {/* Buttons */}
      <div className="flex flex-col xs:flex-row gap-3">
        <Link
          href="/register"
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
          Enrol now <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
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
        <span style={{ color: "#FFB200", fontWeight: 700 }}>87+</span>{" "}
        health workers trained since 2018 &nbsp;·&nbsp; Ministry of Health accredited
      </p>
    </div>
  );
}

export default function HomeHero() {
  const [idx, setIdx] = useState(0);
  const reduced       = useReducedMotion();
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);

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
    <LazyMotion features={domAnimation}>
      {/*
        Full-viewport hero.
        - Photos fill the entire section.
        - Content is centred both axes on top of the photo.
        - Semi-transparent backdrop behind the text card only, not a
          full-screen overlay, so the photo breathes on both sides.
      */}
      <section
        className="hero-section relative overflow-hidden w-full"
        aria-label="Welcome to Musawo Training Center"
      >

        {/* ── Background photo slides ────────────────────────── */}
        <AnimatePresence initial={false}>
          <m.div
            key={slide.id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : FADE_MS / 1000, ease: "easeInOut" }}
            aria-hidden="true"
          >
            <m.div
              className="absolute inset-0 will-change-transform"
              initial={{ scale: 1 }}
              animate={{ scale: reduced ? 1 : 1.07 }}
              transition={{ duration: (HOLD_MS + FADE_MS) / 1000, ease: "linear" }}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={slide.id === 1}
                quality={90}
                sizes="100vw"
                className="object-cover"
                style={{ objectPosition: slide.pos }}
              />
            </m.div>

            {/* Balanced dark vignette - stronger centre-bottom, lighter edges */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 80% 70% at 50% 60%, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.18) 70%, rgba(0,0,0,0.05) 100%)",
              }}
            />
          </m.div>
        </AnimatePresence>

        {/* ── Content card ───────────────────────────────────
            Mobile (< 768px):  centred, standard padding
            Tablet (768-1023px): centred
            Desktop (1024px+): 20% from the left edge
        ─────────────────────────────────────────────────── */}

        {/* Mobile + tablet: centred */}
        <div className="absolute inset-0 flex items-center justify-center px-5 sm:px-10 lg:hidden">
          <AnimatePresence mode="wait">
            <m.div
              key={`card-sm-${slide.id}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{ maxWidth: "440px", width: "100%" }}
            >
              <HeroCard />
            </m.div>
          </AnimatePresence>
        </div>

        {/* Desktop: 20% from left */}
        <div
          className="absolute inset-0 hidden lg:flex items-center"
          style={{ paddingLeft: "clamp(48px, 20vw, 360px)" }}
        >
          <AnimatePresence mode="wait">
            <m.div
              key={`card-lg-${slide.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              style={{ maxWidth: "440px", width: "100%" }}
            >
              <HeroCard />
            </m.div>
          </AnimatePresence>
        </div>

        {/* ── Slide indicator dots (bottom centre) ──────────── */}
        <div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2"
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
    </LazyMotion>
  );
}
