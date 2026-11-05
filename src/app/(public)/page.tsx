import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";

// Cache the homepage for 5 minutes on Render - avoids a cold DB hit on every visit
export const revalidate = 300;
import {
  BookOpen,
  Video,
  Award,
  Banknote,
  Users,
  ArrowRight,
  Briefcase,
} from "lucide-react";
import AnimateIn from "@/components/public/AnimateIn";
import StaggerGrid from "@/components/public/StaggerGrid";
import HomeHero from "@/components/public/HomeHero";
import HomeFaq from "./HomeFaq";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Musawo Training Center | Healthcare Training in Uganda",
  description:
    "Hybrid and online healthcare training with 70% hands-on practicals. Courses in nursing care, childcare, mental health, life support and more. November 2026 intake now open.",
  keywords:
    "healthcare training Uganda, nursing care certificate, caregiver course Kampala, Musawo Training Center",
};

/* ─── Data ────────────────────────────────────────────────────── */

async function getPublicCourses() {
  return db.course.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      slug: true,
      shortDescription: true,
      thumbnailUrl: true,
      fullFeeUgx: true,
      internationalFeeUgx: true,
      feeContactOnly: true,
      durationMonths: true,
      instalmentCount: true,
      category: true,
    },
    orderBy: { createdAt: "asc" },
    take: 8,
  });
}

/* ─── Constants ───────────────────────────────────────────────── */

const FACTS = [
  { icon: Video, label: "Hybrid and online classes with hands-on practicals" },
  { icon: Banknote, label: "Pay with MTN MoMo or Airtel Money" },
  { icon: Users, label: "Taught by licensed doctors, nurses, midwives and other healthcare professionals" },
  { icon: Briefcase, label: "Job placement support included" },
];

const HOW_STEPS = [
  {
    n: "01",
    icon: BookOpen,
    title: "Choose your course",
    body: "Browse our healthcare programmes covering nursing care, childcare, mental health, geriatric care and life support. Pick the one that fits your goals and background.",
  },
  {
    n: "02",
    icon: Banknote,
    title: "Apply and pay",
    body: "Submit your application. The Registrar creates your account and sends you a secure login link. Pay with MTN MoMo or Airtel Money, in full or in instalments.",
  },
  {
    n: "03",
    icon: Video,
    title: "Learn and attend practicals",
    body: "Study online lessons on any device, then attend hands-on sessions in our skills lab. Most of your learning is hands-on and practical.",
  },
  {
    n: "04",
    icon: Award,
    title: "Pass and certify",
    body: "Complete assessments and log book. Receive your certificate on successful completion, shareable with any employer.",
  },
];

const CATEGORY_BADGE: Record<string, { label: string; cls: string }> = {
  PROFESSIONAL: {
    label: "Professionals only",
    cls: "bg-primary/10 text-primary",
  },
  OPEN: { label: "Open to all", cls: "bg-success/10 text-success" },
};

const COURSE_IMAGES: Record<string, string> = {
  "medical-home-caregiver": "/assets/images/cna-course.webp",
  "basic-home-caregiver": "/assets/images/basic-nursing.webp",
  "babysitting-childcare-safety": "/assets/images/first-aid-child-safety.jpg",
  "mental-health-support-advocacy": "/assets/community-outreach.webp",
  "care-older-persons-disability": "/assets/clinical-training.webp",
  "basic-life-support-first-aid": "/assets/training-session.webp",
  "advanced-life-support": "/assets/healthcare-services.webp",
  "advanced-first-aid": "/assets/training-session.webp",
};

/* ─── Page ────────────────────────────────────────────────────── */

export default async function HomePage() {
  const [courses, intakeLabel] = await Promise.all([
    getPublicCourses(),
    getSetting("site.intakeEyebrow", "Now enrolling: November 2026 intake").then(
      (v) => v.replace(/^Now enrolling:\s*/i, "").trim() || "November 2026 intake"
    ),
  ]);

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
                className="flex items-start gap-3 px-4 py-5 sm:px-6 sm:py-6"
                style={{
                  animation: `fadeUp 0.4s ${0.08 + i * 0.08}s ease-out both`,
                }}
                suppressHydrationWarning
              >
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <f.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold text-primary leading-snug">
                  {f.label}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Courses ─────────────────────────────────────────── */}
      <section
        className="py-14 sm:py-20 lg:py-24 px-4 sm:px-6 bg-surface"
        id="courses"
        aria-label="Featured courses"
      >
        <div className="max-w-[1200px] mx-auto">
          <AnimateIn className="mb-12">
            <p className="section-eyebrow">What we offer</p>
            <h2
              className="mt-3 mb-4"
              style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}
            >
              Healthcare training courses
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed max-w-xl">
              Hybrid and online classes with hands-on practicals in our
              skills lab. Taught by licensed doctors, nurses, midwives and
              other healthcare professionals. Courses
              across nursing, childcare, mental health and life
              support.
            </p>
          </AnimateIn>

          <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((c, idx) => {
              const badge = CATEGORY_BADGE[c.category] ?? CATEGORY_BADGE.OPEN;
              const img =
                c.thumbnailUrl ??
                COURSE_IMAGES[c.slug] ??
                "/assets/training-session.webp";
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
                      src={img}
                      alt={c.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(min-width:1024px) 33vw,(min-width:640px) 50vw,100vw"
                      priority={idx < 3}
                      placeholder="blur"
                      blurDataURL="data:image/webp;base64,UklGRjQAAABXRUJQVlA4ICgAAACwAQCdASoIAAUABUB8JZQCsADGJcsAAP7DbSG4Fr5/Xb0yrh0swAAA"
                    />
                    {duration && (
                      <span
                        className="absolute top-3 right-3 bg-white/95 text-primary
                                       text-xs font-bold px-2.5 py-1 rounded-full shadow-sm"
                      >
                        {duration}
                      </span>
                    )}
                  </div>
                  <div className="p-5 sm:p-6 flex flex-col flex-1">
                    <span
                      className={`self-start text-xs font-semibold px-2.5 py-0.5 rounded-full mb-3 ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                    <h3 className="text-base font-bold text-primary mb-2 leading-snug">
                      {c.title}
                    </h3>
                    <p className="text-sm text-gray-500 flex-1 leading-relaxed line-clamp-2 mb-6">
                      {c.shortDescription ?? ""}
                    </p>
                    <div className="pt-6 border-t border-border flex items-center justify-between gap-4">
                      <div>
                        {c.feeContactOnly || !c.fullFeeUgx ? (
                          <p className="text-sm font-semibold text-gray-500">
                            Fee: contact admissions
                          </p>
                        ) : (
                          <>
                            <p className="text-accent font-extrabold text-lg leading-none">
                              UGX {c.fullFeeUgx.toLocaleString()}
                            </p>
                            {c.internationalFeeUgx && (
                              <p className="text-xs text-gray-400 mt-1">
                                International: USD {Math.round(c.internationalFeeUgx / 3600).toLocaleString()}
                              </p>
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
                        View course{" "}
                        <ArrowRight
                          className="w-3.5 h-3.5"
                          aria-hidden="true"
                        />
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
              View all courses{" "}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </AnimateIn>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section
        className="py-14 sm:py-20 lg:py-24 px-4 sm:px-6"
        id="how"
        aria-label="How it works"
      >
        <div className="max-w-[1200px] mx-auto">
          <AnimateIn className="mb-12">
            <p className="section-eyebrow">Simple process</p>
            <h2
              className="mt-3"
              style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}
            >
              Start learning in 4 steps
            </h2>
          </AnimateIn>
          <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_STEPS.map(({ n, icon: Icon, title, body }) => (
              <div
                key={n}
                className="bg-surface rounded-2xl p-5 sm:p-6 border border-border
                           hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-xs font-extrabold text-accent/70 tracking-widest">
                    {n}
                  </span>
                  <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
                </div>
                <h3 className="font-bold text-primary mb-2 text-base">
                  {title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </StaggerGrid>
        </div>
      </section>


      {/* ── Graduates and testimonials ───────────────────────── */}
      <section
        className="py-14 sm:py-20 lg:py-24 px-4 sm:px-6"
        aria-label="Our graduates"
      >
        <div className="max-w-[1200px] mx-auto">
          <AnimateIn className="mb-12">
            <p className="section-eyebrow">Our graduates</p>
            <h2
              className="mt-3"
              style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}
            >
              What our students say
            </h2>
          </AnimateIn>
          <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                quote:
                  "Musawo Training Center gave me the skills and confidence to work as a caregiver. The hybrid format meant I could study and still attend the skills lab.",
                name: "Grace Namutebi",
                role: "Graduate, Basic Home Caregiver Course",
                img: "/assets/images/graduates-field.webp",
                initial: "G",
              },
              {
                quote:
                  "I was a community teacher and had no medical background. The Mental Health Support course gave me practical tools I use every day with my students.",
                name: "Samuel Okello",
                role: "Graduate, Mental Health Support and Advocacy Certificate",
                img: "/assets/images/mobile-care.webp",
                initial: "S",
              },
              {
                quote:
                  "The skills lab practicals made all the difference. I now work as a certified caregiver and am looking at opportunities abroad through the recruitment agency the centre connected me with.",
                name: "Amara Birungi",
                role: "Graduate, Medical Home Caregiver Course",
                img: "/assets/images/graduates-field.webp",
                initial: "A",
              },
            ].map((t) => (
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
                  <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">
                      {t.initial}
                    </span>
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
      <section
        className="py-14 sm:py-20 lg:py-24 px-4 sm:px-6 bg-surface"
        id="faq"
        aria-label="Frequently asked questions"
      >
        <div className="max-w-[760px] mx-auto">
          <AnimateIn className="mb-12">
            <p className="section-eyebrow">FAQ</p>
            <h2
              className="mt-3"
              style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}
            >
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
              See all frequently asked questions{" "}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </AnimateIn>
        </div>
      </section>

    </div>
  );
}
