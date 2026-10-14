"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeroProps {
  /** Local path to the hero image */
  image?: string;
  /** Alt text for the hero image (empty string = decorative) */
  imageAlt?: string;
  /** Page title */
  title: string;
  /** Short description below the title */
  description?: string;
  /** Breadcrumb items; "Home" is always prepended */
  breadcrumbs?: BreadcrumbItem[];
  /** Optional CTA button */
  cta?: { label: string; href: string };
  /** Which side to anchor the content box: "left" (default) or "right" */
  boxSide?: "left" | "right";
  /** objectPosition e.g. "center top", "right center" */
  objectPosition?: string;
  /** Unused - kept for API compatibility */
  large?: boolean;
}

export default function PageHero({
  image,
  imageAlt = "",
  title,
  description,
  breadcrumbs = [],
  cta,
  boxSide = "left",
  objectPosition = "center center",
}: PageHeroProps) {
  const photoRef = useRef<HTMLDivElement>(null);

  // Gentle slow zoom on the photo (12 s, disabled under prefers-reduced-motion)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches || !image || !photoRef.current) return;
    photoRef.current.style.animation = "heroZoom 12s ease-out forwards";
  }, [image]);

  const allBreadcrumbs: BreadcrumbItem[] = [{ label: "Home", href: "/" }, ...breadcrumbs];

  // No-image pages (Terms, Privacy, Refund): plain solid teal banner
  if (!image) {
    return (
      <section
        className="bg-primary-dark flex items-center"
        style={{ minHeight: "clamp(160px, 22vh, 260px)" }}
        aria-label={`${title} page banner`}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 w-full">
          {allBreadcrumbs.length > 1 && (
            <Breadcrumb items={allBreadcrumbs} />
          )}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-[1.1] mt-3 text-balance">
            {title}
          </h1>
          {description && (
            <p className="text-white/75 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative overflow-hidden"
      style={{ minHeight: "clamp(320px, 44vh, 480px)" }}
      aria-label={`${title} page hero`}
    >
      {/* ── Full-width photo at full brightness ─────────────────── */}
      <div ref={photoRef} className="absolute inset-0 will-change-transform">
        <Image
          src={image}
          alt={imageAlt}
          fill
          className="object-cover"
          style={{ objectPosition }}
          priority
          sizes="100vw"
          quality={85}
          aria-hidden={!imageAlt}
        />
      </div>

      {/* ── Content: solid teal box anchored over the photo ─────── */}
      <div
        className={`relative h-full flex items-end pb-10 sm:items-center sm:pb-0
          max-w-[1200px] mx-auto px-4 sm:px-6 py-12
          ${boxSide === "right" ? "justify-end" : "justify-start"}`}
        style={{ minHeight: "inherit" }}
      >
        <div
          className="w-full sm:max-w-[520px] bg-primary-dark rounded-2xl px-8 py-8 sm:py-10 shadow-xl"
          style={{ animation: "heroBoxIn 0.35s cubic-bezier(0.22,1,0.36,1) both" }}
        >
          {/* Breadcrumb */}
          {allBreadcrumbs.length > 1 && (
            <Breadcrumb items={allBreadcrumbs} />
          )}

          <h1
            className="font-bold text-white leading-[1.12] mt-3 text-balance"
            style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)" }}
          >
            {title}
          </h1>

          {description && (
            <p
              className="text-white/80 mt-3 leading-relaxed"
              style={{ fontSize: "clamp(0.9rem, 1.5vw, 1.0625rem)", lineHeight: 1.6 }}
            >
              {description}
            </p>
          )}

          {cta && (
            <div className="mt-6">
              <Link
                href={cta.href}
                className="inline-flex items-center gap-2 bg-accent hover:bg-accent-600 active:scale-[0.97] text-white font-bold px-6 py-2.5 rounded-xl no-underline transition-all shadow-cta text-sm"
              >
                {cta.label}
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-white/55 list-none">
        {items.map((crumb, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 flex-shrink-0" aria-hidden="true" />}
            {crumb.href && i < items.length - 1 ? (
              <Link href={crumb.href} className="hover:text-white no-underline transition-colors flex items-center gap-1">
                {i === 0 ? (
                  <><Home className="w-3 h-3" aria-hidden="true" /><span className="sr-only">Home</span></>
                ) : crumb.label}
              </Link>
            ) : (
              <span className={i === items.length - 1 ? "text-white/90 font-medium" : ""}>
                {i === 0 ? (
                  <><Home className="w-3 h-3 inline" aria-hidden="true" /><span className="sr-only">Home</span></>
                ) : crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
