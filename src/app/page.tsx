import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";

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
      durationWeeks: true,
      accreditationText: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

const STATS = [
  { value: "87+", label: "Health workers trained" },
  { value: "3", label: "Accredited courses" },
  { value: "8", label: "Years of community work" },
  { value: "1,000+", label: "Households served" },
];

const FEATURES = [
  {
    icon: "📱",
    title: "Learn on any device",
    body: "Designed for Ugandan phones with limited data. Content loads fast and works offline.",
  },
  {
    icon: "🎓",
    title: "Nationally accredited",
    body: "All courses are accredited by Uganda's Ministry of Health and Ministry of Education and Sports.",
  },
  {
    icon: "💬",
    title: "Live classes twice a week",
    body: "Short, focused sessions with your tutor — interactive, recorded, and easy to join.",
  },
  {
    icon: "📜",
    title: "Digital certificate",
    body: "Receive a verifiable digital certificate with a unique QR code upon completion.",
  },
  {
    icon: "💳",
    title: "Pay with mobile money",
    body: "MTN MoMo and Airtel Money accepted. Pay in full or in affordable instalments.",
  },
  {
    icon: "🤝",
    title: "Placement support",
    body: "Musawo connects graduates to employment opportunities across Uganda.",
  },
];

export default async function HomePage() {
  const [courses, siteName] = await Promise.all([
    getPublicCourses(),
    getSetting("site.name", "Musawo Training Center"),
  ]);

  return (
    <>
      <a href="#main" className="skip-nav">Skip to main content</a>

      {/* ─── Navbar ─── */}
      <header className="sticky top-0 z-50 bg-primary text-white shadow-lg">
        <nav
          className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between"
          aria-label="Main navigation"
        >
          <Link href="/" className="flex items-center gap-2 no-underline">
            <Image
              src="/assets/musawo-logo-1-20151b00.webp"
              alt="Musawo Training Center logo"
              width={120}
              height={36}
              priority
              className="h-9 w-auto"
            />
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/courses" className="text-white/80 hover:text-white no-underline">
              Courses
            </Link>
            <Link href="/resources" className="text-white/80 hover:text-white no-underline">
              Resources
            </Link>
            <Link href="#about" className="text-white/80 hover:text-white no-underline">
              About
            </Link>
            <Link href="#contact" className="text-white/80 hover:text-white no-underline">
              Contact
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex btn-ghost text-white hover:bg-white/10 no-underline"
            >
              Log in
            </Link>
            <Link href="/register" className="btn-primary text-sm no-underline">
              Enrol now
            </Link>
          </div>
        </nav>
      </header>

      <main id="main">
        {/* ─── Hero ─── */}
        <section
          className="relative bg-primary text-white py-20 px-4 overflow-hidden"
          aria-label="Hero"
        >
          {/* Background image overlay */}
          <div className="absolute inset-0 opacity-20">
            <Image
              src="/assets/banner-1-03fe79e5.webp"
              alt=""
              fill
              className="object-cover"
              aria-hidden="true"
              priority
            />
          </div>
          <div className="relative max-w-4xl mx-auto text-center">
            <span className="inline-block bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
              Learn. Certify. Serve.
            </span>
            <h1 className="text-3xl sm:text-5xl font-bold text-balance leading-tight mb-6">
              Building Uganda&apos;s next generation of{" "}
              <span className="text-accent">compassionate health workers</span>
            </h1>
            <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8 text-balance">
              Online, accredited short courses for nursing care and child safety.
              Study on your phone, pay with mobile money, earn a nationally
              recognised certificate.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register" className="btn-primary text-base px-8 py-3 no-underline">
                Enrol now →
              </Link>
              <Link
                href="/courses"
                className="btn text-white border-2 border-white/40 hover:bg-white/10 text-base px-8 py-3 no-underline"
              >
                View courses
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Stats ─── */}
        <section className="bg-accent py-10 px-4" aria-label="Statistics">
          <ul className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center list-none">
            {STATS.map((stat) => (
              <li key={stat.label}>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-white/80 text-sm mt-1">{stat.label}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ─── Courses ─── */}
        <section className="py-16 px-4 bg-surface" id="courses" aria-label="Courses">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl sm:text-3xl text-center mb-2">
              Our Accredited Courses
            </h2>
            <p className="text-center text-gray-500 mb-10 text-sm">
              Accredited by Uganda Ministry of Health &amp; Ministry of Education and Sports
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.length > 0
                ? courses.map((course) => (
                    <article key={course.id} className="card flex flex-col">
                      {course.thumbnailUrl && (
                        <div className="relative h-44 rounded-xl overflow-hidden mb-4 -mx-2 -mt-2">
                          <Image
                            src={course.thumbnailUrl}
                            alt={`${course.title} course thumbnail`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <h3 className="text-lg mb-2">{course.title}</h3>
                      <p className="text-sm text-gray-500 flex-1">
                        {course.shortDescription}
                      </p>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                        <span className="text-accent font-bold text-sm">
                          UGX {course.fullFeeUgx.toLocaleString()}
                        </span>
                        {course.durationWeeks && (
                          <span className="text-xs text-gray-400">
                            {course.durationWeeks} weeks
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/courses/${course.slug}`}
                        className="btn-primary mt-4 no-underline text-center"
                      >
                        Learn more
                      </Link>
                    </article>
                  ))
                : /* Placeholder cards shown before seed data */
                  [
                    {
                      title: "Certified Nursing Care Assistant (CNA)",
                      desc: "Our flagship certification equips you to work as a qualified nursing care assistant across Uganda.",
                      slug: "cna",
                    },
                    {
                      title: "Basic Nursing Care Assistant",
                      desc: "An accessible entry point into healthcare work with a strong foundation in patient care.",
                      slug: "basic-nursing-care",
                    },
                    {
                      title: "Babysitting, Child Care & Safety Management",
                      desc: "Attentive, informed child care — from daily routines to first aid and emergency response.",
                      slug: "child-care-safety",
                    },
                  ].map((c) => (
                    <article key={c.slug} className="card flex flex-col">
                      <h3 className="text-lg mb-2">{c.title}</h3>
                      <p className="text-sm text-gray-500 flex-1">{c.desc}</p>
                      <Link
                        href={`/courses/${c.slug}`}
                        className="btn-primary mt-4 no-underline text-center"
                      >
                        Learn more
                      </Link>
                    </article>
                  ))}
            </div>
          </div>
        </section>

        {/* ─── Why MTC ─── */}
        <section className="py-16 px-4" id="about" aria-label="Why MTC">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl sm:text-3xl text-center mb-2">
              Why Musawo Training Center?
            </h2>
            <p className="text-center text-gray-500 mb-10 text-sm max-w-xl mx-auto">
              Designed for Ugandan learners — mobile-first, affordable, and built
              around real healthcare needs.
            </p>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 list-none">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex gap-4">
                  <span className="text-3xl flex-shrink-0" aria-hidden="true">
                    {f.icon}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold mb-1">{f.title}</h3>
                    <p className="text-sm text-gray-500">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ─── Accreditation ─── */}
        <section
          className="bg-surface py-12 px-4 text-center"
          aria-label="Accreditation"
        >
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-3">Nationally Accredited</h2>
            <p className="text-gray-500 text-sm mb-6">
              All Musawo Training Center courses are fully accredited by the
              Government of Uganda.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              {[
                "Uganda Ministry of Health",
                "Ministry of Education and Sports",
              ].map((body) => (
                <div
                  key={body}
                  className="border-2 border-primary/20 rounded-xl px-6 py-3 text-sm font-medium text-primary"
                >
                  🏛️ {body}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Scholarships ─── */}
        <section className="py-16 px-4 bg-primary text-white" aria-label="Scholarships">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl text-white mb-4">
              Scholarship Opportunities
            </h2>
            <p className="text-white/80 mb-6 text-sm max-w-xl mx-auto">
              We believe cost should never stop someone from becoming a health
              worker. A limited number of subsidised and scholarship places are
              available each intake for learners who cannot afford the full fee.
            </p>
            <Link
              href="/register?scholarship=1"
              className="btn bg-accent text-white hover:bg-accent-600 text-base px-8 py-3 no-underline"
            >
              Apply for a scholarship
            </Link>
          </div>
        </section>

        {/* ─── Testimonial placeholder ─── */}
        <section className="py-16 px-4" aria-label="Graduate testimonials">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl mb-8">What our graduates say</h2>
            <blockquote className="card text-left">
              <p className="text-gray-600 italic mb-4">
                &ldquo;Musawo Training Center gave me the skills and confidence to
                work as a nursing care assistant. The online format meant I could
                study around my family, and the practical days at Lungujja
                made everything real.&rdquo;
              </p>
              <footer className="text-sm font-medium text-primary">
                — Graduate, Certified Nursing Care Assistant (Placeholder — replace with real quote)
              </footer>
            </blockquote>
          </div>
        </section>

        {/* ─── Contact / Support ─── */}
        <section
          className="bg-surface py-16 px-4"
          id="contact"
          aria-label="Contact"
        >
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl mb-4">Need help?</h2>
            <p className="text-gray-500 mb-6 text-sm">
              Our student support team is here for you. Reach us any time.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:training@musawo.ug"
                className="btn-secondary no-underline"
              >
                📧 training@musawo.ug
              </a>
              <a
                href="tel:+256700000000"
                className="btn-outline no-underline"
              >
                📞 +256 700 000 000
              </a>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Plot 5, ADFA Building, Zone 8 Lungujja, Kampala, Uganda
            </p>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="bg-primary text-white py-12 px-4">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-8">
          <div>
            <Image
              src="/assets/musawo-logo-1-20151b00.webp"
              alt="Musawo Training Center"
              width={120}
              height={36}
              className="h-8 w-auto mb-3 filter brightness-0 invert"
            />
            <p className="text-white/60 text-sm">
              Certified health-worker training for Ugandan communities.
            </p>
          </div>
          <div>
            <h3 className="text-white text-sm font-semibold uppercase tracking-wide mb-3">
              Courses
            </h3>
            <ul className="space-y-2 text-sm text-white/70 list-none">
              <li>
                <Link href="/courses/cna" className="hover:text-white no-underline">
                  Certified Nursing Care Assistant
                </Link>
              </li>
              <li>
                <Link href="/courses/basic-nursing-care" className="hover:text-white no-underline">
                  Basic Nursing Care Assistant
                </Link>
              </li>
              <li>
                <Link href="/courses/child-care-safety" className="hover:text-white no-underline">
                  Child Care &amp; Safety Management
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-white text-sm font-semibold uppercase tracking-wide mb-3">
              Links
            </h3>
            <ul className="space-y-2 text-sm text-white/70 list-none">
              <li>
                <Link href="/resources" className="hover:text-white no-underline">
                  Free Resources
                </Link>
              </li>
              <li>
                <a
                  href="https://musawo.ug"
                  className="hover:text-white no-underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Musawo.ug ↗
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-white no-underline">
                  Student login
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between text-xs text-white/40 gap-2">
          <p>
            © {new Date().getFullYear()} Musawo / Allied Doctors and Friends of Uganda
            (ADFA). All rights reserved.
          </p>
          <p>
            <Link href="/privacy" className="hover:text-white/70 no-underline">
              Privacy Policy
            </Link>{" "}
            ·{" "}
            <Link href="/terms" className="hover:text-white/70 no-underline">
              Terms
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}
