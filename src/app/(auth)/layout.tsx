"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

/** Map pathname prefix → hero photo src */
function getHeroPhoto(pathname: string): { src: string; alt: string } {
  if (pathname.startsWith("/register")) {
    return {
      src: "/assets/images/hero-register.webp",
      alt: "Community health training — MTC Uganda",
    };
  }
  return {
    src: "/assets/images/hero-login.webp",
    alt: "Healthcare worker performing a blood check — MTC",
  };
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { src: heroSrc, alt: heroAlt } = getHeroPhoto(pathname);

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/*
       * ─── LEFT HALF ──────────────────────────────────────────────
       * Desktop only (lg+). Full-height 50% column with the hero
       * photo at full brightness. Caption box anchored 32 px from
       * the bottom-left corner.
       */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden flex-shrink-0">
        {/* Full-bleed photo */}
        <Image
          src={heroSrc}
          alt={heroAlt}
          fill
          className="object-cover object-[center_30%]"
          priority
          aria-hidden="true"
        />

        {/* Caption box — solid brand teal, 32 px from edges */}
        <motion.div
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          className="absolute bottom-8 left-8 right-8 bg-primary rounded-2xl px-7 py-6"
          style={{ maxWidth: "420px" }}
        >
          <p className="text-white font-bold text-lg leading-snug text-balance">
            Become a certified health worker from anywhere in Uganda
          </p>
          <p className="text-white/70 text-sm mt-1.5">
            Accredited online courses. Study on your phone.
          </p>
        </motion.div>
      </div>

      {/*
       * ─── RIGHT HALF ─────────────────────────────────────────────
       * Full width on mobile/tablet, half-width on desktop.
       * White background. Top bar + centred form card.
       */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">

        {/* ── Mobile: slim photo banner ───────────────────────────── */}
        <div className="lg:hidden relative">
          {/* Teal bar above the photo with logo + back arrow */}
          <div className="bg-primary flex items-center justify-between px-4 py-3">
            <Link
              href="/"
              className="flex items-center gap-2 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
              aria-label="Musawo Training Center — back to home"
            >
              <span className="flex items-center justify-center bg-white rounded-lg w-9 h-9 flex-shrink-0 shadow-sm p-1">
                <Image
                  src="/assets/logo-header.png"
                  alt="Musawo Training Center"
                  width={28}
                  height={28}
                  className="w-full h-full object-contain"
                  priority
                />
              </span>
              <span className="text-white font-bold text-sm leading-tight">Musawo Training Center</span>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1 text-white/90 text-sm font-medium no-underline hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded px-1"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Home</span>
            </Link>
          </div>
          {/* Slim photo strip */}
          <div className="relative h-40 sm:h-48 overflow-hidden">
            <Image
              src={heroSrc}
              alt={heroAlt}
              fill
              className="object-cover object-[center_30%]"
              priority
              aria-hidden="true"
            />
          </div>
        </div>

        {/* ── Desktop top bar ─────────────────────────────────────── */}
        <div className="hidden lg:flex items-center justify-between px-8 py-5 border-b border-border/50">
          <Link
            href="/"
            className="flex items-center gap-3 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-lg"
            aria-label="Musawo Training Center — back to home"
          >
            <span className="flex items-center justify-center bg-white rounded-xl w-[46px] h-[46px] flex-shrink-0 shadow-sm border border-border/60 p-1.5">
              <Image
                src="/assets/logo-header.png"
                alt="Musawo Training Center"
                width={36}
                height={36}
                className="w-full h-full object-contain"
                priority
              />
            </span>
            <span className="font-extrabold text-primary text-sm leading-tight">
              Musawo Training Center
            </span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary no-underline hover:underline underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to home
          </Link>
        </div>

        {/* ── Form area ───────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full"
            style={{ maxWidth: "440px" }}
          >
            {children}
          </motion.div>

          {/* Footer row */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Your information is protected
            </span>
            <span aria-hidden="true">·</span>
            <a
              href="https://wa.me/256700000000"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-primary no-underline hover:underline transition-colors"
            >
              Need help? WhatsApp us
            </a>
            <span aria-hidden="true">·</span>
            <Link href="/terms" className="text-gray-400 hover:text-primary no-underline hover:underline transition-colors">
              Terms
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/privacy" className="text-gray-400 hover:text-primary no-underline hover:underline transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
