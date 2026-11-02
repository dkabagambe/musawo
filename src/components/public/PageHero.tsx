// PageHero is a SERVER component — no "use client" needed.
// The slow-zoom animation is isolated in HeroZoom (tiny client component).
import Image from "next/image";
import Link from "next/link";
import HeroZoom from "./HeroZoom";
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
  /** Tiny blur data URL for placeholder="blur" */
  blurDataURL?: string;
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

// Precomputed blur placeholders for the most-used hero images.
// Generated with: sharp(file).resize(8,5).webp({quality:20}).toBuffer()
const BLUR: Record<string, string> = {
  "/assets/images/hero-about.webp":
    "data:image/webp;base64,UklGRnoAAABXRUJQVlA4WAoAAAAQAAAABwAABAAAQUxQSCkAAAAAKzJKq6s/Mij5/+f//+b/5Pr/5///5//k+v/n///n/+RLUWTFxVtSQgBWUDggKgAAAJABAJ0BKggABQAFQHwlnAACl7EmgADMnGvOQyPNUvMpNtb1wkbwAAAAAA==",
  "/assets/images/hero-courses.webp":
    "data:image/webp;base64,UklGRjQAAABXRUJQVlA4ICgAAACwAQCdASoIAAUABUB8JZQCsADGJcsAAP7DbSG4Fr5/Xb0yrh0swAAA",
  "/assets/images/musawo-session.webp":
    "data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAADQAQCdASoIAAUABUB8JaACdAD5jGKpzAD1yeuwQ9YSaHH3JiygMMhXjLjY7uTMHAAAAA==",
  "/assets/images/hero-training.jpg":
    "data:image/webp;base64,UklGRkIAAABXRUJQVlA4IDYAAACwAQCdASoIAAUABUB8JbACdADyfwfYAPa+jaD2KBd0fMHzB/MEfGAEQCrqMK2YPjhD2dRlYAA=",
  "/assets/images/graduates-clinic.jpg":
    "data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUABUB8JYgCdAEWUO6AVoAA/qihPkmolmnM1/y8oZsGzZHi15t2BL9ItgAA",
};

export default function PageHero({
  image,
  imageAlt = "",
  blurDataURL,
  title,
  description,
  breadcrumbs = [],
  cta,
  boxSide = "left",
  objectPosition = "center center",
}: PageHeroProps) {
  const allBreadcrumbs: BreadcrumbItem[] = [{ label: "Home", href: "/" }, ...breadcrumbs];
  const blur = blurDataURL ?? (image ? BLUR[image] : undefined);

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
      style={{ minHeight: "clamp(320px, 44vh, 480px)", backgroundColor: "#0c2c3a" }}
      aria-label={`${title} page hero`}
    >
      {/* Full-width photo with slow-zoom animation */}
      <HeroZoom>
        <Image
          src={image}
          alt={imageAlt}
          fill
          className="object-cover"
          style={{ objectPosition }}
          priority
          sizes="100vw"
          quality={80}
          placeholder={blur ? "blur" : "empty"}
          blurDataURL={blur}
          aria-hidden={!imageAlt}
        />
      </HeroZoom>

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.10) 100%)",
        }}
      />

      {/* Content box anchored over the photo */}
      <div
        className={`relative z-10 h-full flex items-end pb-10 sm:items-center sm:pb-0
          max-w-[1200px] mx-auto px-4 sm:px-6 py-12
          ${boxSide === "right" ? "justify-end" : "justify-start"}`}
        style={{ minHeight: "inherit" }}
      >
        <div
          className="w-full sm:max-w-[520px] bg-primary-dark rounded-2xl px-5 py-7 sm:px-8 sm:py-10 shadow-xl"
          style={{ animation: "heroBoxIn 0.35s cubic-bezier(0.22,1,0.36,1) both" }}
        >
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
