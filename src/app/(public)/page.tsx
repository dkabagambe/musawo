import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { getContactInfo } from "@/lib/contact";
import {
  CheckCircle, BookOpen, Video, Award, Smartphone, Banknote,
  Users, ArrowRight, ShieldCheck, GraduationCap,
} from "lucide-react";
import AnimateIn from "@/components/public/AnimateIn";
import StaggerGrid from "@/components/public/StaggerGrid";
import CountUp from "@/components/public/CountUp";
import HomeFaq from "./HomeFaq";

/* ─── Data ────────────────────────────────────────────────────── */

async function getPublicCourses() {
  return db.course.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true, title: true, slug: true,
      shortDescription: true, thumbnailUrl: true,
      fullFeeUgx: true, durationWeeks: true, instalmentCount: true,
    },
    orderBy: { createdAt: "asc" },
    take: 3,
  });
}

/* ─── Constants ───────────────────────────────────────────────── */

const FACTS = [
  { icon: ShieldCheck, label: "Ministry of Health accredited" },
  { icon: Smartphone,  label: "100% online — study on your phone" },
  { icon: Banknote,    label: "Pay with MTN or Airtel Money" },
  { icon: Users,       label: "Scholarships available every intake" },
];

const HOW_STEPS = [
  { n: "01", icon: BookOpen, title: "Choose your course",
    body: "Browse our accredited health-worker courses and pick the one that fits your goals." },
  { n: "02", icon: Banknote, title: "Pay with mobile money",
    body: "MTN MoMo or Airtel Money — pay in full or split into affordable instalments." },
  { n: "03", icon: Video,    title: "Learn & attend live classes",
    body: "Study at your own pace on any device, then join live sessions with your tutor twice a week." },
  { n: "04", icon: Award,    title: "Pass your exam & certify",
    body: "Complete your assessments and download your nationally recognised digital certificate." },
];

const STATS = [
  { value: "1,000+", label: "Households served" },
  { value: "87+",    label: "Health workers trained" },
  { value: "52+",    label: "Outreach events" },
  { value: "8",      label: "Years of service" },
];

const PLACEHOLDER_COURSES = [
  {
    title: "Certified Nursing Care Assistant (CNA)",
    desc: "Our flagship certification for nursing care assistants across Uganda.",
    slug: "cna", weeks: 12 as number | null, fee: 850000,
    img: "/assets/images/course-cna.webp", instalments: 3,
  },
  {
    title: "Basic Nursing Care Assistant",
    desc: "An accessible entry point with a strong foundation in patient care.",
    slug: "basic-nursing-care", weeks: 8 as number | null, fee: 550000,
    img: "/assets/images/course-basic-nursing.webp", instalments: 2,
  },
  {
    title: "Babysitting, Child Care & Safety Management",
    desc: "Child care, first aid, and emergency response for child safety workers.",
    slug: "child-care-safety", weeks: 6 as number | null, fee: 420000,
    img: "/assets/images/course-child-safety.webp", instalments: 1,
  },
];

const TESTIMONIALS = [
  {
    quote: "Musawo Training Center gave me the skills and confidence to work as a nursing care assistant. The online format meant I could study around my family.",
    name: "Grace Namutebi", role: "Graduate, Certified Nursing Care Assistant",
    img: "/assets/images/graduates-field.webp", initial: "G",
  },
  {
    quote: "I was worried about studying online, but the tutors were so supportive. I passed my exam on the first attempt and now work at a clinic in Kawempe.",
    name: "Samuel Okello", role: "Graduate, Basic Nursing Care Assistant",
    img: "/assets/images/mobile-care.webp", initial: "S",
  },
  {
    quote: "The scholarship programme made it possible for me to train without the full fee upfront. I am now employed and can support my family.",
    name: "Amara Birungi", role: "Graduate, Child Care & Safety",
    img: "/assets/images/graduates-field.webp", initial: "A",
  },
];

const PLACEMENT_POINTS = [
  "Nationally recognised digital certificate with QR verification",
  "Job placement support through the Musawo employer network",
  "Access to the free resource library after graduation",
  "Alumni community of health workers across Uganda",
];

/* ─── Page ────────────────────────────────────────────────────── */

export default async function HomePage() {
  const [courses, contact] = await Promise.all([
    getPublicCourses(),
    getContactInfo(),
    getSetting("site.name", "Musawo Training Center"),
  ]);

  const displayCourses = courses.length > 0
    ? courses.map((c) => ({
        title: c.title, desc: c.shortDescription ?? "", slug: c.slug,
        weeks: c.durationWeeks ?? null, fee: c.fullFeeUgx,
        img: c.thumbnailUrl ?? "/assets/images/course-cna.webp",
        instalments: c.instalmentCount,
      }))
    : PLACEHOLDER_COURSES;

  return (
    <div className="pb-24">

      {/* ══════════════════════════════════════════════════════════
          HERO
          Desktop layout (sm+):
          - Section starts directly below the fixed header (no negative
            margin). The header is h-16 (64px) and position:fixed, so
            the section fills from y=64px downward.
          - min-height = max(calc(100vh - 64px), 760px), max 900px, so
            the visible hero is always at least 760px and never more than
            900px, growing with content if needed.
          - The photo fills the whole section (absolute inset-0) and uses
            object-position "right 15%" to keep the subject's head clear
            of the left-side box while showing as little of the blurred
            background person on the left as possible.
          - Content wrapper: flex + items-center centres the box in the
            remaining height. pt-16 pb-24 (64px top, 96px bottom) gives
            at least 64px breathing room above and below the box.

          Mobile layout (< sm):
          - 4:3 photo sits at the top in normal flow.
          - Teal box sits below with mx-4 px-7 py-8 padding, 24px
            top margin for separation from the photo.
      ══════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        aria-label="Hero"
      >
        {/* ── Desktop height spacer ──
             Both the photo and content wrapper are absolute, so the
             section would otherwise collapse on desktop. This invisible
             block lives in flow on sm+ and gives the section its height.
             Mobile: hidden — height comes from the photo + box in flow.
        ── */}
        <div
          className="hidden sm:block w-full"
          style={{ minHeight: "clamp(760px, calc(100vh - 64px), 900px)" }}
          aria-hidden="true"
        />
        {/* ── Full-brightness background photo (desktop only) ── */}
        <div
          className="hidden sm:block absolute inset-0 will-change-transform"
          style={{ animation: "heroZoom 14s ease-out forwards" }}
          suppressHydrationWarning
          aria-hidden="true"
        >
          <Image
            src="/assets/images/hero-training.jpg"
            alt=""
            fill
            priority
            quality={85}
            sizes="100vw"
            className="object-cover"
            /*
             * object-position:
             *   "right 15%" — "right" anchors the right side of the image
             *   so the woman with the stethoscope (right half of the photo)
             *   stays fully in frame. "15%" offsets the vertical anchor point
             *   so the very top of her head clears the header, while keeping
             *   the blurred second person mostly off the left edge.
             */
            style={{ objectPosition: "right 15%" }}
          />
        </div>

        {/* ── Mobile photo (natural flow, 4:3) ── */}
        <div className="sm:hidden w-full aspect-[4/3] relative overflow-hidden">
          <Image
            src="/assets/images/hero-training.jpg"
            alt="Nursing care assistant in a clinical setting"
            fill
            priority
            quality={85}
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: "right 15%" }}
          />
        </div>

        {/* ── Desktop content wrapper ──
             Uses min-height on this element (not the section) so the section
             grows naturally on mobile while the desktop area is always tall
             enough. flex + items-center vertically centres the box.
             pt-16 = 64px gap below header, pb-24 = 96px gap above facts strip.
        ── */}
        <div
          className={[
            "hidden sm:flex sm:flex-col sm:items-start sm:justify-center",
            "sm:absolute sm:inset-0",
            "sm:pt-16 sm:pb-24",
          ].join(" ")}
        >
          {/* Inner centering grid: left box max 500px, right stays free */}
          <div className="max-w-[1200px] w-full mx-auto px-6 flex items-center">
            <div
              className={[
                "bg-primary rounded-2xl shadow-2xl",
                "px-10 py-10",
                "w-full max-w-[500px]",
              ].join(" ")}
              style={{ animation: "heroBoxIn 0.35s 0.1s cubic-bezier(0.22,1,0.36,1) both" }}
              suppressHydrationWarning
            >
              {/* Eyebrow */}
              <p className="inline-flex items-center gap-2 bg-accent/20 border border-accent/40
                             text-accent text-[11px] font-bold px-3 py-1.5 rounded-full
                             uppercase tracking-wider mb-4">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" aria-hidden="true" />
                Now enrolling — January 2027 intake
              </p>

              {/* Headline */}
              <h1
                className="font-bold text-white text-balance leading-[1.15] mb-5"
                style={{ fontSize: "clamp(2rem, 3.6vw, 3.25rem)" }}
              >
                Train to become a certified community health worker
              </h1>

              {/* Description */}
              <p
                className="text-white/80 mb-8 leading-[1.65]"
                style={{ fontSize: "clamp(0.9375rem, 1.3vw, 1.0625rem)" }}
              >
                Accredited online short courses in nursing care and child safety — study on your phone, pay with mobile money.
              </p>

              {/* CTAs */}
              <div className="flex flex-col xs:flex-row gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 bg-accent
                             hover:bg-accent-600 active:scale-[0.97] text-white font-bold
                             text-sm px-7 py-3.5 rounded-xl no-underline transition-all shadow-cta
                             w-full xs:w-auto"
                >
                  Enrol now <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/courses"
                  className="inline-flex items-center justify-center gap-2 bg-white/10
                             hover:bg-white/20 active:scale-[0.97] border border-white/30
                             text-white font-semibold text-sm px-7 py-3.5 rounded-xl
                             no-underline transition-all w-full xs:w-auto"
                >
                  <BookOpen className="w-4 h-4" aria-hidden="true" /> Browse courses
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile content box (below the photo) ── */}
        <div className="sm:hidden mx-4 mt-6 mb-8">
          <div
            className={[
              "bg-primary rounded-2xl shadow-2xl",
              "px-7 py-8",
              "w-full",
            ].join(" ")}
            style={{ animation: "heroBoxIn 0.35s 0.1s cubic-bezier(0.22,1,0.36,1) both" }}
            suppressHydrationWarning
          >
            {/* Eyebrow */}
            <p className="inline-flex items-center gap-2 bg-accent/20 border border-accent/40
                           text-accent text-[11px] font-bold px-3 py-1.5 rounded-full
                           uppercase tracking-wider mb-4">
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" aria-hidden="true" />
              Now enrolling — January 2027 intake
            </p>

            {/* Headline */}
            <h1
              className="font-bold text-white text-balance leading-[1.15] mb-5"
              style={{ fontSize: "clamp(1.875rem, 5vw, 2.5rem)" }}
            >
              Train to become a certified community health worker
            </h1>

            {/* Description */}
            <p className="text-white/80 mb-8 leading-[1.65] text-base">
              Accredited online short courses in nursing care and child safety — study on your phone, pay with mobile money.
            </p>

            {/* CTAs */}
            <div className="flex flex-col gap-3">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-accent
                           hover:bg-accent-600 active:scale-[0.97] text-white font-bold
                           text-sm px-7 py-3.5 rounded-xl no-underline transition-all shadow-cta"
              >
                Enrol now <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link
                href="/courses"
                className="inline-flex items-center justify-center gap-2 bg-white/10
                           hover:bg-white/20 active:scale-[0.97] border border-white/30
                           text-white font-semibold text-sm px-7 py-3.5 rounded-xl
                           no-underline transition-all"
              >
                <BookOpen className="w-4 h-4" aria-hidden="true" /> Browse courses
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FACTS STRIP
          Desktop: overlaps the bottom edge of the photo only (not
          the box). 64px gap from box bottom achieved via sm:pb-[96px]
          on the hero + the strip's -mt-8 only reaching the photo.
          Mobile: sits below the box with 16px margin, no overlap.
      ══════════════════════════════════════════════════════════ */}
      <div
        className="mx-4 mt-6 sm:mx-6 sm:-mt-8 sm:relative sm:z-10 lg:mx-auto lg:max-w-[1200px]"
      >
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.09)] border border-border">
          <ul
            className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 divide-x divide-border list-none"
            aria-label="Key facts"
          >
            {FACTS.map((f, i) => (
              <li
                key={f.label}
                className="flex items-start gap-4 px-6 py-6 sm:px-7 sm:py-7"
                style={{ animation: `fadeUp 0.4s ${0.08 + i * 0.08}s ease-out both` }}
                suppressHydrationWarning
              >
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <f.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold text-primary leading-snug">{f.label}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          WHAT WE OFFER — 3 course cards
      ══════════════════════════════════════════════════════════ */}
      <section
        className="py-24 px-4 sm:px-6 bg-surface"
        id="courses"
        aria-label="Featured courses"
      >
        <div className="max-w-[1200px] mx-auto">
          <AnimateIn className="mb-12">
            <p className="section-eyebrow">What we offer</p>
            <h2 className="mt-3 mb-4" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              Accredited healthcare courses
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed max-w-xl">
              Fully accredited by Uganda&apos;s Ministry of Health &amp; Ministry of Education and Sports.
            </p>
          </AnimateIn>

          <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayCourses.map((c) => (
              <article
                key={c.slug}
                className="bg-white rounded-2xl overflow-hidden shadow-card border border-border
                           flex flex-col group hover:shadow-card-hover hover:-translate-y-1
                           transition-all duration-200"
              >
                <div className="relative h-52 overflow-hidden flex-shrink-0">
                  <Image
                    src={c.img} alt={c.title} fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(min-width:1024px) 33vw,(min-width:640px) 50vw,100vw"
                  />
                  {c.weeks && (
                    <span className="absolute top-3 right-3 bg-white/95 text-primary
                                     text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                      {c.weeks} weeks
                    </span>
                  )}
                </div>
                <div className="p-8 flex flex-col flex-1">
                  <h3 className="text-base font-bold text-primary mb-2 leading-snug">{c.title}</h3>
                  <p className="text-sm text-gray-500 flex-1 leading-relaxed line-clamp-2 mb-6">{c.desc}</p>
                  <div className="pt-6 border-t border-border flex items-center justify-between gap-4">
                    <div>
                      <p className="text-accent font-extrabold text-lg leading-none">
                        UGX {c.fee.toLocaleString()}
                      </p>
                      {(c.instalments ?? 1) > 1 && (
                        <p className="text-xs text-gray-400 mt-1">or {c.instalments} instalments</p>
                      )}
                    </div>
                    <Link
                      href={`/courses/${c.slug}`}
                      className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-600
                                 text-white text-xs font-bold px-4 py-2.5 rounded-xl
                                 no-underline transition-colors flex-shrink-0"
                    >
                      View course <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </StaggerGrid>

          <AnimateIn className="mt-10">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 text-primary font-semibold
                         text-sm hover:text-accent no-underline transition-colors"
            >
              View all courses <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </AnimateIn>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          HOW IT WORKS — 4 steps
      ══════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6" id="how" aria-label="How it works">
        <div className="max-w-[1200px] mx-auto">
          <AnimateIn className="mb-12">
            <p className="section-eyebrow">Simple process</p>
            <h2 className="mt-3" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              Start learning in 4 steps
            </h2>
          </AnimateIn>
          <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_STEPS.map(({ n, icon: Icon, title, body }) => (
              <div
                key={n}
                className="bg-surface rounded-2xl p-8 border border-border
                           hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-xs font-extrabold text-accent/70 tracking-widest">{n}</span>
                  <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
                </div>
                <h3 className="font-bold text-primary mb-2 text-base">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          WHY MUSAWO — large photo + 3 points
      ══════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 bg-surface" aria-label="Why Musawo">
        <div className="max-w-[1200px] mx-auto lg:grid lg:grid-cols-2 lg:gap-16 items-center">
          <AnimateIn className="relative rounded-2xl overflow-hidden aspect-[4/3] mb-12 lg:mb-0 shadow-xl">
            <Image
              src="/assets/images/graduates-field.webp"
              alt="Musawo graduates working in healthcare across Uganda"
              fill
              className="object-cover"
            />
            {/* caption card */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="bg-white/96 rounded-xl p-4 shadow">
                <p className="text-primary font-bold text-sm">Employment support included</p>
                <p className="text-gray-500 text-xs mt-0.5 leading-snug">
                  Musawo connects graduates with healthcare employers across Uganda
                </p>
              </div>
            </div>
          </AnimateIn>
          <AnimateIn delay={0.1}>
            <p className="section-eyebrow">Your career after graduation</p>
            <h2 className="mt-3 mb-6" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              Your career starts the moment you certify
            </h2>
            <ul className="space-y-5 list-none mb-10">
              {PLACEMENT_POINTS.map((item) => (
                <li key={item} className="flex items-start gap-4 text-base text-gray-600 leading-[1.65]">
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-600
                         active:scale-[0.97] text-white font-bold px-7 py-3.5 rounded-xl
                         no-underline transition-all shadow-cta"
            >
              Start your journey <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </AnimateIn>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          NUMBERS ROW
      ══════════════════════════════════════════════════════════ */}
      <section className="bg-primary py-20 px-4 sm:px-6" aria-label="Impact numbers">
        <div className="max-w-[1200px] mx-auto">
          <StaggerGrid className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-2">
                <CountUp value={s.value} className="text-4xl sm:text-5xl font-extrabold text-accent" />
                <span className="text-white/70 text-sm leading-snug">{s.label}</span>
              </div>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SCHOLARSHIPS CTA BAND
      ══════════════════════════════════════════════════════════ */}
      <section
        className="relative py-24 px-4 sm:px-6 overflow-hidden"
        aria-label="Scholarships"
      >
        <div className="absolute inset-0">
          <Image
            src="/assets/images/hero-faq-scholarships.webp"
            alt="" fill
            className="object-cover"
            style={{ objectPosition: "center 40%" }}
            aria-hidden="true"
          />
          {/* Solid teal overlay — intentional for this full-bleed CTA band */}
          <div className="absolute inset-0 bg-primary/85" aria-hidden="true" />
        </div>
        <AnimateIn className="relative max-w-[680px] mx-auto text-center text-white">
          <p className="section-eyebrow text-accent mb-3">Access &amp; funding</p>
          <h2
            className="font-extrabold text-white mb-5"
            style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}
          >
            Scholarships &amp; financial access
          </h2>
          <p className="text-white/80 mb-10 leading-[1.65] text-lg max-w-lg mx-auto">
            Cost should never be a barrier. We reserve subsidised and full scholarship places every intake.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/scholarships"
              className="inline-flex items-center justify-center gap-2 bg-accent
                         hover:bg-accent-600 active:scale-[0.97] text-white font-bold
                         text-base px-8 py-4 rounded-xl no-underline transition-all shadow-cta"
            >
              Learn about scholarships <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <a
              href={contact.whatsappUrl}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white/10
                         hover:bg-white/20 border border-white/30 text-white font-semibold
                         text-base px-8 py-4 rounded-xl no-underline transition-all"
            >
              💬 Ask on WhatsApp
            </a>
          </div>
        </AnimateIn>
      </section>

      {/* ══════════════════════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6" aria-label="Student testimonials">
        <div className="max-w-[1200px] mx-auto">
          <AnimateIn className="mb-12">
            <p className="section-eyebrow">Our graduates</p>
            <h2 className="mt-3" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              What our students say
            </h2>
          </AnimateIn>
          <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t) => (
              <blockquote
                key={t.name}
                className="bg-white rounded-2xl border border-border p-8 flex flex-col
                           hover:shadow-card-hover transition-shadow duration-200"
              >
                <div
                  className="text-5xl text-accent/20 font-serif leading-none select-none mb-4"
                  aria-hidden="true"
                >
                  &ldquo;
                </div>
                <p className="text-gray-600 text-base italic leading-[1.65] flex-1 mb-8">
                  {t.quote}
                </p>
                <footer className="flex items-center gap-4">
                  <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0">
                    <Image src={t.img} alt="" fill className="object-cover" sizes="44px" />
                  </div>
                  <div>
                    <p className="font-bold text-primary text-sm">{t.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t.role}</p>
                  </div>
                </footer>
              </blockquote>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FAQ PREVIEW
      ══════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 bg-surface" id="faq" aria-label="Frequently asked questions">
        <div className="max-w-[760px] mx-auto">
          <AnimateIn className="mb-12">
            <p className="section-eyebrow">FAQ</p>
            <h2 className="mt-3" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              Frequently asked questions
            </h2>
          </AnimateIn>
          <HomeFaq />
          <AnimateIn className="mt-10">
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 text-accent font-semibold text-sm
                         hover:text-accent-600 no-underline transition-colors"
            >
              See all frequently asked questions <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </AnimateIn>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FINAL CTA BAND
      ══════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 bg-primary" aria-label="Call to action">
        <AnimateIn className="max-w-[760px] mx-auto text-center">
          <h2
            className="font-extrabold text-white mb-5"
            style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}
          >
            Ready to become a health worker?
          </h2>
          <p className="text-white/75 mb-10 text-lg leading-[1.65] max-w-lg mx-auto">
            Join the January 2027 intake. Enrol in minutes, study on your phone, certify in weeks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-accent
                         hover:bg-accent-600 active:scale-[0.97] text-white font-bold
                         text-base px-8 py-4 rounded-xl no-underline transition-all shadow-cta"
            >
              Enrol now <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <a
              href={contact.whatsappUrl}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white/10
                         hover:bg-white/20 border border-white/30 text-white font-semibold
                         text-base px-8 py-4 rounded-xl no-underline transition-all"
            >
              Chat on WhatsApp
            </a>
          </div>
        </AnimateIn>
      </section>

    </div>
  );
}
