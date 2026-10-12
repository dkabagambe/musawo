import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { getContactInfo } from "@/lib/contact";
import {
  CheckCircle, BookOpen, Video, Award, Smartphone, Banknote,
  Users, ChevronDown, Instagram, ArrowRight,
} from "lucide-react";

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

const TRUST_BADGES = [
  { icon: Award, label: "Ministry of Health accredited" },
  { icon: Smartphone, label: "Learn on your phone" },
  { icon: Banknote, label: "MTN & Airtel Money" },
  { icon: Users, label: "Scholarships available" },
];

const HOW_STEPS = [
  { n: "01", icon: BookOpen, title: "Choose your course", body: "Browse our accredited health-worker courses and pick the one that fits your goals." },
  { n: "02", icon: Banknote, title: "Pay with mobile money", body: "MTN MoMo or Airtel Money. Pay in full or split into affordable instalments." },
  { n: "03", icon: Video, title: "Learn & attend live classes", body: "Study at your own pace on any device, then join focused live sessions with your tutor twice a week." },
  { n: "04", icon: Award, title: "Pass your exam & certify", body: "Complete your course assessments and download your nationally recognised digital certificate." },
];

const STATS = [
  { value: "87+", label: "Health workers trained" },
  { value: "3", label: "Accredited courses" },
  { value: "8", label: "Years of service" },
  { value: "1,000+", label: "Households served" },
];

const FAQS = [
  { q: "Are the courses nationally recognised?", a: "Yes. All Musawo Training Center courses are fully accredited by Uganda's Ministry of Health and Ministry of Education and Sports." },
  { q: "How do I pay?", a: "You can pay with MTN Mobile Money, Airtel Money, a bank card, or a bank transfer. Instalment payment plans are available on all courses." },
  { q: "Can I study on a basic smartphone?", a: "Yes. The platform is designed for low-data mobile connections. Content loads fast, and lesson notes can be downloaded for offline reading." },
  { q: "Are scholarships available?", a: "Yes. A limited number of subsidised and full scholarship places are allocated each intake for learners who cannot afford the full fee. Apply when you register." },
  { q: "How long does each course take?", a: "Courses range from 6 to 12 weeks. You study at your own pace alongside live classes twice a week." },
];

const PLACEHOLDER_COURSES = [
  { title: "Certified Nursing Care Assistant (CNA)", desc: "Our flagship certification for nursing care assistants across Uganda.", slug: "cna", weeks: 12, fee: 850000, img: "/assets/images/cna-course.png", instalments: 1 },
  { title: "Basic Nursing Care Assistant", desc: "An accessible entry point with a strong foundation in patient care.", slug: "basic-nursing-care", weeks: 8, fee: 550000, img: "/assets/images/basic-nursing.png", instalments: 1 },
  { title: "Babysitting, Child Care & Safety Management", desc: "Child care, first aid, and emergency response for child safety workers.", slug: "child-care-safety", weeks: 6, fee: 420000, img: "/assets/images/first-aid-child-safety.jpg", instalments: 1 },
];

export default async function HomePage() {
  const [courses, contact, siteName] = await Promise.all([
    getPublicCourses(),
    getContactInfo(),
    getSetting("site.name", "Musawo Training Center"),
  ]);

  const displayCourses = courses.length > 0
    ? courses.map((c) => ({ title: c.title, desc: c.shortDescription ?? "", slug: c.slug, weeks: c.durationWeeks ?? null, fee: c.fullFeeUgx, img: c.thumbnailUrl ?? "/assets/images/hero-training.jpg", instalments: c.instalmentCount }))
    : PLACEHOLDER_COURSES;

  return (
    <>
      <a href="#main" className="skip-nav">Skip to main content</a>

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-primary/96 backdrop-blur-md text-white shadow-lg border-b border-white/10">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4" aria-label="Main navigation">
          <Link href="/" className="flex items-center gap-3 no-underline flex-shrink-0">
            <Image src="/assets/logo.webp" alt={siteName} width={36} height={36} priority className="h-9 w-9 rounded-lg object-contain" />
            <span className="hidden sm:flex flex-col leading-tight">
              <span className="font-extrabold text-white text-sm">{siteName}</span>
              <span className="text-white/50 text-[10px] font-normal tracking-wide">LEARN · CERTIFY · SERVE</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-0.5 text-sm font-medium">
            {[["Courses", "/courses"], ["Resources", "/resources"], ["About", "#about"], ["Contact", "/contact"]].map(([label, href]) => (
              <Link key={href} href={href} className="text-white/75 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg no-underline transition-colors">{label}</Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-lg no-underline transition-colors">Log in</Link>
            <Link href="/register" className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-600 text-white text-sm font-bold px-5 py-2 rounded-xl no-underline transition-colors shadow-cta">
              Enrol now <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </nav>
      </header>

      <main id="main">
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="relative bg-primary text-white overflow-hidden min-h-[88vh] flex items-center" aria-label="Hero">
          <div className="absolute inset-0">
            <Image src="/assets/images/hero-training.jpg" alt="" fill className="object-cover object-top" priority aria-hidden="true" />
            <div className="hero-overlay" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 w-full">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-accent/25 border border-accent/50 text-accent-100 text-xs font-bold px-3 py-1.5 rounded-full mb-7 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse-slow" aria-hidden="true" />
                Now enrolling — January 2027 intake
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6 text-white text-balance">
                Train{" "}
                <span className="text-accent">Musawo</span>:{" "}
                building Uganda&apos;s next generation of compassionate community health workers
              </h1>

              <p className="text-lg sm:text-xl text-white/80 mb-8 max-w-xl leading-relaxed text-balance">
                Online, accredited short courses in nursing care and child safety. Study on your phone, pay with mobile money, earn a nationally recognised certificate.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-600 text-white font-bold text-base px-8 py-3.5 rounded-xl no-underline transition-all shadow-cta hover:shadow-lg active:scale-[0.98]">
                  Enrol now <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link href="/courses" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold text-base px-8 py-3.5 rounded-xl no-underline transition-all active:scale-[0.98]">
                  <BookOpen className="w-4 h-4" aria-hidden="true" /> Browse courses
                </Link>
              </div>

              {/* Trust strip */}
              <ul className="flex flex-wrap gap-x-6 gap-y-2.5 list-none">
                {TRUST_BADGES.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2 text-sm text-white/70">
                    <CheckCircle className="w-4 h-4 text-success flex-shrink-0" aria-hidden="true" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Scroll cue */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 animate-bounce hidden sm:block" aria-hidden="true">
            <ChevronDown className="w-6 h-6" />
          </div>
        </section>

        {/* ── Stats ─────────────────────────────────────────────── */}
        <section className="bg-accent" aria-label="Impact statistics">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center list-none">
              {STATS.map((s) => (
                <li key={s.label} className="flex flex-col items-center gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white">{s.value}</span>
                  <span className="text-white/75 text-xs sm:text-sm">{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Featured Courses ───────────────────────────────────── */}
        <section className="py-20 px-4 sm:px-6 bg-surface" id="courses" aria-label="Featured courses">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <p className="section-eyebrow">What we offer</p>
              <h2 className="text-3xl sm:text-4xl mt-2 mb-3">Accredited Healthcare Courses</h2>
              <p className="section-lead mx-auto text-center">
                Fully accredited by Uganda&apos;s Ministry of Health &amp; Ministry of Education and Sports.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {displayCourses.map((c) => (
                <article key={c.slug} className="bg-white rounded-2xl overflow-hidden shadow-card border border-border hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200 flex flex-col group">
                  <div className="relative h-52 overflow-hidden">
                    <Image src={c.img} alt={c.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                    {c.weeks && (
                      <span className="absolute top-3 right-3 bg-white/90 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
                        {c.weeks} weeks
                      </span>
                    )}
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-base font-bold text-primary mb-2 leading-snug">{c.title}</h3>
                    <p className="text-sm text-gray-500 flex-1 leading-relaxed line-clamp-2">{c.desc}</p>
                    <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                      <div>
                        <p className="text-accent font-extrabold text-lg leading-none">UGX {c.fee.toLocaleString()}</p>
                        {(c.instalments ?? 1) > 1 && <p className="text-xs text-gray-400 mt-0.5">or {c.instalments} instalments</p>}
                      </div>
                      <Link href={`/courses/${c.slug}`} className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-600 text-white text-xs font-bold px-4 py-2 rounded-xl no-underline transition-colors">
                        Enrol <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link href="/courses" className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:text-accent no-underline transition-colors">
                View all courses <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────────── */}
        <section className="py-20 px-4 sm:px-6" id="how" aria-label="How it works">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14">
              <p className="section-eyebrow">Simple process</p>
              <h2 className="text-3xl sm:text-4xl mt-2">Start learning in 4 steps</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {HOW_STEPS.map(({ n, icon: Icon, title, body }) => (
                <div key={n} className="relative">
                  <div className="bg-surface rounded-2xl p-6 border border-border h-full">
                    <div className="flex items-start gap-4 mb-4">
                      <span className="text-xs font-extrabold text-accent/60 tracking-widest">{n}</span>
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                      </div>
                    </div>
                    <h3 className="font-bold text-primary mb-2">{title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── After graduation ───────────────────────────────────── */}
        <section className="py-20 px-4 sm:px-6 bg-surface" id="about" aria-label="After graduation">
          <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] mb-10 lg:mb-0 shadow-xl">
              <Image src="/assets/images/graduates-clinic.jpg" alt="Musawo graduates working in a community clinic" fill className="object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/80 to-transparent p-6">
                <div className="bg-white/95 rounded-xl p-4">
                  <p className="text-primary font-bold text-sm">Employment support included</p>
                  <p className="text-gray-500 text-xs mt-0.5">Musawo connects graduates with healthcare employers across Uganda</p>
                </div>
              </div>
            </div>
            <div>
              <p className="section-eyebrow">After you graduate</p>
              <h2 className="text-3xl sm:text-4xl mt-2 mb-6">Your career starts the moment you certify</h2>
              <ul className="space-y-4 list-none mb-8">
                {[
                  "Nationally recognised digital certificate with QR verification",
                  "Job placement support through the Musawo network",
                  "Access to the free resource library after graduation",
                  "Alumni community of health workers across Uganda",
                  "Continuing education courses coming soon",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-600">
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="inline-flex items-center gap-2 bg-accent hover:bg-accent-600 text-white font-bold px-7 py-3 rounded-xl no-underline transition-colors shadow-cta">
                Start your journey <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Scholarships ────────────────────────────────────────── */}
        <section className="relative py-24 px-4 sm:px-6 overflow-hidden" aria-label="Scholarships">
          <div className="absolute inset-0">
            <Image src="/assets/images/community-care.jpg" alt="" fill className="object-cover" aria-hidden="true" />
            <div className="hero-overlay-center" />
          </div>
          <div className="relative max-w-3xl mx-auto text-center text-white">
            <p className="section-eyebrow text-accent">Access & funding</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4">
              Scholarships &amp; Access
            </h2>
            <p className="text-white/80 mb-8 max-w-xl mx-auto leading-relaxed text-lg">
              Cost should never be a barrier to becoming a health worker. We reserve a limited number of subsidised and full scholarship places each intake.
            </p>
            <Link href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-accent hover:bg-accent-600 text-white font-bold text-base px-8 py-3.5 rounded-xl no-underline transition-all shadow-cta">
              Inquire via WhatsApp <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* ── Testimonial ─────────────────────────────────────────── */}
        <section className="py-20 px-4 sm:px-6" aria-label="Testimonials">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <p className="section-eyebrow">Our graduates</p>
              <h2 className="text-3xl mt-2">What students say</h2>
            </div>
            <blockquote className="bg-surface rounded-2xl border border-border p-8 relative">
              <div className="text-7xl text-accent/15 font-serif absolute top-4 left-6 leading-none select-none" aria-hidden="true">&ldquo;</div>
              <p className="text-gray-600 text-lg italic leading-relaxed relative z-10 mb-6">
                Musawo Training Center gave me the skills and confidence to work as a nursing care assistant. The online format meant I could study around my family, and the practical days at Lungujja made everything real.
              </p>
              <footer className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">G</div>
                <div>
                  <p className="font-bold text-primary text-sm">Graduate, Certified Nursing Care Assistant</p>
                  <p className="text-xs text-gray-400 mt-0.5">Placeholder — replace with a real graduate quote before launch</p>
                </div>
              </footer>
            </blockquote>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────── */}
        <section className="py-20 px-4 sm:px-6 bg-surface" id="faq" aria-label="Frequently asked questions">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <p className="section-eyebrow">FAQ</p>
              <h2 className="text-3xl mt-2">Frequently asked questions</h2>
            </div>
            <div className="space-y-3">
              {FAQS.map((faq) => (
                <details key={faq.q} className="bg-white rounded-2xl border border-border group">
                  <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer font-semibold text-primary text-sm list-none">
                    {faq.q}
                    <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0" aria-hidden="true" />
                  </summary>
                  <p className="px-6 pb-5 text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────── */}
        <section className="py-20 px-4 sm:px-6 bg-primary" aria-label="Call to action">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Ready to become a health worker?
            </h2>
            <p className="text-white/75 mb-8 text-lg max-w-xl mx-auto">
              Join the January 2027 intake. Enrol in minutes, study on your phone, certify in weeks.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-600 text-white font-bold text-base px-8 py-3.5 rounded-xl no-underline transition-all shadow-cta">
                Enrol now <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold text-base px-8 py-3.5 rounded-xl no-underline transition-all">
                Chat on WhatsApp
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="bg-[#07241F] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <Image src="/assets/logo.webp" alt={siteName} width={44} height={44} className="h-11 w-11 rounded-xl object-contain" />
                <div>
                  <p className="font-extrabold text-white text-sm">{siteName}</p>
                  <p className="text-white/40 text-xs">Allied Doctors and Friends of Uganda</p>
                </div>
              </div>
              <p className="text-white/55 text-sm leading-relaxed max-w-xs mb-5">
                {contact.tagline}
              </p>
              {/* Social links */}
              <div className="flex items-center gap-3">
                <a href={contact.instagramUrl} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-white/10 hover:bg-accent rounded-lg flex items-center justify-center no-underline transition-colors" aria-label="Instagram">
                  <Instagram className="w-4 h-4" aria-hidden="true" />
                </a>
                {/* TikTok SVG icon */}
                <a href={contact.tiktokUrl} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-white/10 hover:bg-accent rounded-lg flex items-center justify-center no-underline transition-colors" aria-label="TikTok">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.54a8.16 8.16 0 004.77 1.52V7.6a4.85 4.85 0 01-1-.91z"/></svg>
                </a>
              </div>
            </div>

            {/* Courses */}
            <div>
              <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-4">Courses</h3>
              <ul className="space-y-2.5 text-sm text-white/55 list-none">
                <li><Link href="/courses/cna" className="hover:text-white no-underline transition-colors">Certified Nursing Care Assistant</Link></li>
                <li><Link href="/courses/basic-nursing-care" className="hover:text-white no-underline transition-colors">Basic Nursing Care Assistant</Link></li>
                <li><Link href="/courses/child-care-safety" className="hover:text-white no-underline transition-colors">Child Care &amp; Safety</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-4">Contact</h3>
              <ul className="space-y-3 text-sm text-white/55 list-none">
                <li>
                  <a href={`mailto:${contact.email}`} className="hover:text-white no-underline transition-colors flex items-start gap-2">
                    <span className="mt-0.5" aria-hidden="true">✉</span> {contact.email}
                  </a>
                </li>
                <li>
                  <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hover:text-white no-underline transition-colors flex items-start gap-2">
                    <span className="mt-0.5" aria-hidden="true">📞</span> {contact.phone}
                  </a>
                </li>
                <li>
                  <a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white no-underline transition-colors flex items-start gap-2">
                    <span className="mt-0.5" aria-hidden="true">💬</span> WhatsApp
                  </a>
                </li>
                <li>
                  <span className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0" aria-hidden="true">📍</span>
                    <span>{contact.address}</span>
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-white/35">
            <p>© {new Date().getFullYear()} MUSAWO / Allied Doctors and Friends of Uganda (ADFA). All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-white/60 no-underline transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white/60 no-underline transition-colors">Terms</Link>
              <Link href="/login" className="hover:text-white/60 no-underline transition-colors">Student login</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Floating WhatsApp button ────────────────────────────────── */}
      <a
        href={contact.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-xl no-underline transition-transform hover:scale-110 active:scale-95"
        style={{ backgroundColor: "#25D366" }}
        aria-label="Chat with us on WhatsApp"
      >
        <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </>
  );
}
