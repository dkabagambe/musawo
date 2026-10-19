import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { getContactInfo } from "@/lib/contact";
import { existsSync } from "fs";
import { join } from "path";
import {
  CheckCircle, BookOpen, Video, Award, Banknote,
  Users, ArrowRight, GraduationCap, Briefcase,
} from "lucide-react";
import AnimateIn from "@/components/public/AnimateIn";
import StaggerGrid from "@/components/public/StaggerGrid";
import CountUp from "@/components/public/CountUp";
import CTABand from "@/components/public/CTABand";
import ContactBand from "@/components/public/ContactBand";
import HomeHero from "@/components/public/HomeHero";
import HomeFaq from "./HomeFaq";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Musawo Training Center | Healthcare Training in Uganda",
  description:
    "Hybrid and online healthcare training with 70% hands-on practicals. Courses in nursing care, childcare, mental health, life support and more. November 2026 intake now open.",
  keywords: "healthcare training Uganda, nursing care certificate, caregiver course Kampala, Musawo Training Center",
};

/* ─── Data ────────────────────────────────────────────────────── */

async function getPublicCourses() {
  return db.course.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true, title: true, slug: true,
      shortDescription: true, thumbnailUrl: true,
      fullFeeUgx: true, feeContactOnly: true,
      durationMonths: true, instalmentCount: true,
      category: true,
    },
    orderBy: { createdAt: "asc" },
    take: 6,
  });
}

/* ─── Constants ───────────────────────────────────────────────── */

const FACTS = [
  { icon: Video,    label: "Hybrid and online classes with 70% practicals" },
  { icon: Banknote, label: "Pay with MTN, Airtel or bank transfer" },
  { icon: Users,    label: "Taught by doctors, nurses and clinicians" },
  { icon: Briefcase, label: "Job placement support included" },
];

const HOW_STEPS = [
  { n: "01", icon: BookOpen, title: "Choose your course",
    body: "Browse our seven healthcare programmes covering nursing care, childcare, mental health, geriatric care and life support. Pick the one that fits your goals and background." },
  { n: "02", icon: Banknote, title: "Apply and pay",
    body: "Submit your application. The Registrar creates your account and sends you a secure login link. Pay with MTN MoMo, Airtel Money or bank transfer, in full or in instalments." },
  { n: "03", icon: Video,    title: "Learn and attend practicals",
    body: "Study online lessons on any device, then attend hands-on sessions in our skills lab. Hybrid delivery means 70% of your learning is practical." },
  { n: "04", icon: Award,    title: "Pass and certify",
    body: "Complete assessments and log book. Receive your digital certificate with QR verification, shareable with any employer." },
];

const STATS = [
  { value: "1,000+", label: "Households served" },
  { value: "87+",    label: "Health workers trained" },
  { value: "52+",    label: "Outreach events" },
  { value: "7",      label: "Programmes offered" },
];

const PLACEMENT_POINTS = [
  "Digital certificate with QR verification",
  "Job placement support in Uganda",
  "Job opportunities abroad through licensed recruitment agencies with pre-departure preparation",
  "Access to the free resource library after graduation",
  "Alumni community of health workers across Uganda",
];

const CATEGORY_BADGE: Record<string, { label: string; cls: string }> = {
  PROFESSIONAL: { label: "Professionals only", cls: "bg-primary/10 text-primary" },
  OPEN:         { label: "Open to all",        cls: "bg-success/10 text-success" },
};

const COURSE_IMAGES: Record<string, string> = {
  "medical-home-caregiver":       "/assets/images/cna-course.png",
  "basic-home-caregiver":         "/assets/images/basic-nursing.png",
  "babysitting-childcare-safety": "/assets/images/first-aid-child-safety.jpg",
  "mental-health-support-advocacy":             "/assets/community-outreach.webp",
  "care-older-persons-disability":              "/assets/clinical-training.webp",
  "basic-life-support-first-aid":               "/assets/training-session.webp",
  "advanced-life-support":                      "/assets/healthcare-services.webp",
};

/* ─── Page ────────────────────────────────────────────────────── */

export default async function HomePage() {
  const [courses, contact, intakeEyebrow] = await Promise.all([
    getPublicCourses(),
    getContactInfo(),
    getSetting("site.intakeEyebrow", "Now enrolling: November 2026 intake"),
  ]);

  // Extract intake label from eyebrow (e.g. "Now enrolling: November 2026 intake" -> "November 2026 intake")
  const intakeLabel = intakeEyebrow.replace(/^Now enrolling:\s*/i, "").trim() || "November 2026 intake";

  // Check if the flyer file has been uploaded to the public folder
  const flyerExists = existsSync(join(process.cwd(), "public", "assets", "flyer-nov-2026.png"));

  return (
    <div>

      {/* Hero slideshow */}
      <HomeHero intakeLabel={intakeLabel} />

      {/* ── Facts strip ─────────────────────────────────────── */}
      <div className="bg-[#F1F7F5]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <ul
            className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border list-none"
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

      {/* Call for applications flyer section */}
      <section
        className="py-10 sm:py-14 px-4 sm:px-6 bg-accent/5 border-y border-accent/20"
        aria-label="Call for applications"
      >
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center gap-8">
          <div className="flex-1 min-w-0">
            <p className="section-eyebrow text-accent mb-2">Now accepting applications</p>
            <h2 className="text-xl sm:text-2xl font-extrabold text-primary mb-3">
              {intakeEyebrow}
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-5 max-w-lg">
              Seven healthcare programmes are open for the November 2026 intake. Hybrid delivery with hands-on practicals in our skills lab. Taught by doctors, nurses and clinicians.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/apply"
                className="inline-flex items-center gap-2 bg-accent hover:bg-accent-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl no-underline transition-all"
              >
                Apply now <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
              {flyerExists && (
                <a
                  href="/assets/flyer-nov-2026.png"
                  download="MTC-November-2026-Flyer.jpeg"
                  className="inline-flex items-center gap-2 bg-white border border-border text-primary font-semibold text-sm px-5 py-2.5 rounded-xl no-underline hover:border-accent/40 transition-all"
                >
                  Download flyer
                </a>
              )}
            </div>
          </div>
          {/* Flyer thumbnail - shown only when file has been uploaded */}
          {flyerExists && (
            <div className="flex-shrink-0 w-40 sm:w-48">
              <a
                href="/assets/flyer-nov-2026.png"
                download="MTC-November-2026-Flyer.jpeg"
                aria-label="Download November 2026 intake flyer"
                className="block rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-card-hover transition-shadow"
              >
                <Image
                  src="/assets/flyer-nov-2026.png"
                  alt="Musawo Training Center November 2026 intake flyer"
                  width={192}
                  height={272}
                  className="w-full object-cover"
                />
              </a>
            </div>
          )}
        </div>
      </section>

      {/* ── Courses ─────────────────────────────────────────── */}
      <section
        className="py-14 sm:py-20 lg:py-24 px-4 sm:px-6 bg-surface"
        id="courses"
        aria-label="Featured courses"
      >
        <div className="max-w-[1200px] mx-auto">
          <AnimateIn className="mb-12">
            <p className="section-eyebrow">What we offer</p>
            <h2 className="mt-3 mb-4" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              Healthcare training courses
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed max-w-xl">
              Hybrid and online classes with 70% hands-on practicals in our skills lab. Taught by doctors, nurses and clinicians. Seven programmes across nursing, childcare, mental health and life support.
            </p>
          </AnimateIn>

          <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((c) => {
              const badge = CATEGORY_BADGE[c.category] ?? CATEGORY_BADGE.OPEN;
              const img   = c.thumbnailUrl ?? COURSE_IMAGES[c.slug] ?? "/assets/training-session.webp";
              const duration = c.durationMonths
                ? `${c.durationMonths} month${c.durationMonths > 1 ? "s" : ""}`
                : null;

              return (
                <article
                  key={c.slug}
                  className="bg-white rounded-2xl overflow-hidden shadow-card border border-border
                             flex flex-col group hover:shadow-card-hover hover:-translate-y-1
                             transition-all duration-200"
                >
                  <div className="relative h-52 overflow-hidden flex-shrink-0">
                    <Image
                      src={img} alt={c.title} fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(min-width:1024px) 33vw,(min-width:640px) 50vw,100vw"
                    />
                    {duration && (
                      <span className="absolute top-3 right-3 bg-white/95 text-primary
                                       text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                        {duration}
                      </span>
                    )}
                  </div>
                  <div className="p-8 flex flex-col flex-1">
                    <span className={`self-start text-xs font-semibold px-2.5 py-0.5 rounded-full mb-3 ${badge.cls}`}>
                      {badge.label}
                    </span>
                    <h3 className="text-base font-bold text-primary mb-2 leading-snug">{c.title}</h3>
                    <p className="text-sm text-gray-500 flex-1 leading-relaxed line-clamp-2 mb-6">
                      {c.shortDescription ?? ""}
                    </p>
                    <div className="pt-6 border-t border-border flex items-center justify-between gap-4">
                      <div>
                        {c.feeContactOnly || !c.fullFeeUgx ? (
                          <p className="text-sm font-semibold text-gray-500">Fee: contact admissions</p>
                        ) : (
                          <>
                            <p className="text-accent font-extrabold text-lg leading-none">
                              UGX {c.fullFeeUgx.toLocaleString()}
                            </p>
                            {(c.instalmentCount ?? 1) > 1 && (
                              <p className="text-xs text-gray-400 mt-1">or {c.instalmentCount} instalments</p>
                            )}
                          </>
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
              );
            })}
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

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="py-14 sm:py-20 lg:py-24 px-4 sm:px-6" id="how" aria-label="How it works">
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

      {/* ── Why Musawo ───────────────────────────────────────── */}
      <section className="py-14 sm:py-20 lg:py-24 px-4 sm:px-6 bg-surface" aria-label="Why Musawo">
        <div className="max-w-[1200px] mx-auto lg:grid lg:grid-cols-2 lg:gap-16 items-center">
          <AnimateIn className="relative rounded-2xl overflow-hidden aspect-[4/3] mb-12 lg:mb-0 shadow-xl">
            <Image
              src="/assets/images/musawo-session.webp"
              alt="Hands-on training in the Musawo Training Center skills lab"
              fill
              className="object-cover"
              style={{ objectPosition: "center 30%" }}
            />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="bg-white/96 rounded-xl p-4 shadow">
                <p className="text-primary font-bold text-sm">Job placement support included</p>
                <p className="text-gray-500 text-xs mt-0.5 leading-snug">
                  Musawo connects graduates with healthcare employers in Uganda and abroad
                </p>
              </div>
            </div>
          </AnimateIn>
          <AnimateIn delay={0.1}>
            <p className="section-eyebrow">After you graduate</p>
            <h2 className="mt-3 mb-6" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              Learn. Serve. Transform.
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
              href="/apply"
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-600
                         active:scale-[0.97] text-white font-bold px-7 py-3.5 rounded-xl
                         no-underline transition-all shadow-cta"
            >
              Apply now <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </AnimateIn>
        </div>
      </section>

      {/* ── Impact numbers ───────────────────────────────────── */}
      <section className="bg-primary py-14 sm:py-20 px-4 sm:px-6" aria-label="Impact numbers">
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

      {/* ── Graduates and testimonials ───────────────────────── */}
      <section className="py-14 sm:py-20 lg:py-24 px-4 sm:px-6" aria-label="Our graduates">
        <div className="max-w-[1200px] mx-auto">
          <AnimateIn className="mb-12">
            <p className="section-eyebrow">Our graduates</p>
            <h2 className="mt-3" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              What our students say
            </h2>
          </AnimateIn>
          <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                quote: "Musawo Training Center gave me the skills and confidence to work as a caregiver. The hybrid format meant I could study and still attend the skills lab.",
                name: "Grace Namutebi", role: "Graduate, Basic Home Caregiver Course",
                img: "/assets/images/graduates-field.webp", initial: "G",
              },
              {
                quote: "I was a community teacher and had no medical background. The Mental Health Support course gave me practical tools I use every day with my students.",
                name: "Samuel Okello", role: "Graduate, Mental Health Support and Advocacy Certificate",
                img: "/assets/images/mobile-care.webp", initial: "S",
              },
              {
                quote: "The skills lab practicals made all the difference. I now work as a certified caregiver and am looking at opportunities abroad through the recruitment agency the centre connected me with.",
                name: "Amara Birungi", role: "Graduate, Medical Home Caregiver Course",
                img: "/assets/images/graduates-field.webp", initial: "A",
              },
            ].map((t) => (
              <blockquote
                key={t.name}
                className="bg-white rounded-2xl border border-border p-8 flex flex-col
                           hover:shadow-card-hover transition-shadow duration-200"
              >
                <div className="text-5xl text-accent/20 font-serif leading-none select-none mb-4" aria-hidden="true">
                  &ldquo;
                </div>
                <p className="text-gray-600 text-base italic leading-[1.65] flex-1 mb-8">
                  {t.quote}
                </p>
                <footer className="flex items-center gap-4">
                  <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">{t.initial}</span>
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

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 lg:py-24 px-4 sm:px-6 bg-surface" id="faq" aria-label="Frequently asked questions">
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

      <CTABand
        heading="Ready to become a healthcare professional?"
        subheading={`Apply for the ${intakeLabel}. Hybrid classes with hands-on practicals in our skills lab.`}
        primaryLabel="Apply now"
        primaryHref="/apply"
        whatsappUrl={contact.whatsappUrl}
      />
      <ContactBand whatsappUrl={contact.whatsappUrl} />

    </div>
  );
}
