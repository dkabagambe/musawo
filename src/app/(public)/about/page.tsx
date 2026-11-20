import PageHero from "@/components/public/PageHero";
import SideNav from "@/components/public/SideNav";
import AnimateIn from "@/components/public/AnimateIn";
import StaggerGrid from "@/components/public/StaggerGrid";
import { CheckCircle } from "lucide-react";
import { getSetting } from "@/lib/settings";
import type { Metadata } from "next";

// About page is mostly static content - cache for 1 hour
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Musawo Training Center is a non-profit academic institution in Lugala, Kampala offering practical short healthcare courses. Learn about our vision, mission and values.",
};

const ABOUT_NAV = [
  { label: "About MTC", href: "/about" },
  { label: "FAQ",       href: "/faq" },
];

const TIMELINE = [
  { year: "2018", title: "Founded",          body: "Musawo Training Center was established in Kampala to train community health workers across Uganda." },
  { year: "2021", title: "Skills lab",        body: "Opened a dedicated skills lab for hands-on practical training, enabling the hybrid delivery model." },
  { year: "2023", title: "Growth",            body: "Expanded training programmes and grew the network of community health workers across Kampala and surrounding districts." },
  { year: "2025", title: "Online platform",   body: "Launched the online learning platform, extending training to students across Uganda with hybrid classes." },
  { year: "2026", title: "Eight programmes",  body: "Expanded to eight healthcare programmes covering home care, childcare, mental health, geriatric care and life support." },
];

const VALUES = [
  { emoji: "🤲", title: "Compassion",    body: "We put the dignity and wellbeing of patients, students and communities at the heart of everything we do." },
  { emoji: "🎓", title: "Excellence",    body: "We hold our training to high standards, ensuring every graduate is ready for clinical practice." },
  { emoji: "🌍", title: "Accessibility", body: "Affordable fees, hybrid learning, and flexible instalments ensure no one is excluded because of cost." },
  { emoji: "🤝", title: "Community",     body: "We are rooted in Ugandan communities and measure our success by the health of the people our graduates serve." },
];

export default async function AboutPage() {
  const accreditationText = await getSetting("site.accreditationText", "");

  return (
    <div className="bg-surface">
      <PageHero
        image="/assets/images/hero-professional-training-1.jpg"
        imageAlt="Musawo Training Center staff and skills lab"
        title="About Musawo Training Center"
        breadcrumbs={[{ label: "About" }]}
        boxSide="right"
        objectPosition="left center"
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
        <div className="sidenav-layout">
          <SideNav title="About" items={ABOUT_NAV} />

          <div className="flex-1 min-w-0 space-y-16">

            {/* ── Who we are ──────────────────────────────────────── */}
            <section aria-label="Who we are">
              <AnimateIn>
                <p className="section-eyebrow">Who we are</p>
                <h2 className="mt-2 mb-5 font-bold text-primary text-balance"
                    style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}>
                  About Musawo Training Center
                </h2>
                <p className="text-gray-600 leading-relaxed max-w-2xl text-balance">
                  Musawo Training Center (MTC) is a non-profit academic institution in Lugala,
                  Rubaga Division, Kampala, Uganda. We offer practical short courses in allied
                  healthcare, including home-based care, childcare, care of elderly and persons
                  with disabilities, First Aid, Basic &amp; Advanced life support and mental
                  health support. Our training combines flexible online and classroom theory with
                  hands-on practice. It prepares compassionate, skilled caregivers for families,
                  health facilities and communities.
                </p>
              </AnimateIn>
            </section>

            {/* ── Vision & Mission ────────────────────────────────── */}
            <section aria-label="Vision and mission">
              <AnimateIn>
                <p className="section-eyebrow">Our purpose</p>
                <h2 className="mt-2 mb-8 font-bold text-primary text-balance"
                    style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}>
                  Vision &amp; Mission
                </h2>
              </AnimateIn>

              <div className="grid sm:grid-cols-2 gap-5">
                {/* Vision */}
                <AnimateIn delay={0.05}>
                  <div className="relative bg-white rounded-2xl border border-border shadow-card overflow-hidden h-full flex flex-col">
                    {/* Accent top bar */}
                    <div className="h-1.5 bg-accent w-full flex-shrink-0" aria-hidden="true" />
                    <div className="p-7 flex flex-col flex-1">
                      <div className="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center text-xl mb-5 flex-shrink-0"
                           role="img" aria-label="Vision">
                        🔭
                      </div>
                      <h3 className="font-extrabold text-base text-primary uppercase tracking-wide mb-3">
                        Our Vision
                      </h3>
                      <div className="w-8 h-0.5 bg-accent rounded-full mb-4" aria-hidden="true" />
                      <p className="text-gray-600 text-sm leading-relaxed flex-1">
                        To be the leading community healthcare training centre in Uganda,
                        producing competent, compassionate and values-driven health workers
                        who transform the wellbeing of families and communities.
                      </p>
                    </div>
                  </div>
                </AnimateIn>

                {/* Mission */}
                <AnimateIn delay={0.1}>
                  <div className="relative bg-white rounded-2xl border border-border shadow-card overflow-hidden h-full flex flex-col">
                    {/* Primary top bar */}
                    <div className="h-1.5 bg-primary w-full flex-shrink-0" aria-hidden="true" />
                    <div className="p-7 flex flex-col flex-1">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-xl mb-5 flex-shrink-0"
                           role="img" aria-label="Mission">
                        🎯
                      </div>
                      <h3 className="font-extrabold text-base text-primary uppercase tracking-wide mb-3">
                        Our Mission
                      </h3>
                      <div className="w-8 h-0.5 bg-primary rounded-full mb-4" aria-hidden="true" />
                      <p className="text-gray-600 text-sm leading-relaxed flex-1">
                        To equip women and youth with practical, high-quality healthcare skills
                        through innovative training, mentorship, and values-based education —
                        producing competent caregivers who bring safe, compassionate, and
                        affordable care directly to patients, families and communities.
                      </p>
                    </div>
                  </div>
                </AnimateIn>
              </div>
            </section>

            {/* ── Accreditation (conditional) ─────────────────────── */}
            {accreditationText && (
              <section aria-label="Accreditation">
                <AnimateIn>
                  <div className="bg-white border border-border rounded-2xl px-6 py-5 shadow-card">
                    <div className="flex items-center gap-3 text-sm font-bold text-primary">
                      <CheckCircle className="w-5 h-5 text-success flex-shrink-0" aria-hidden="true" />
                      {accreditationText}
                    </div>
                  </div>
                </AnimateIn>
              </section>
            )}

            {/* ── Values ──────────────────────────────────────────── */}
            <section aria-label="Our values">
              <AnimateIn className="mb-8">
                <p className="section-eyebrow">What drives us</p>
                <h2 className="mt-2 font-bold text-primary"
                    style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}>
                  Our values
                </h2>
              </AnimateIn>

              <StaggerGrid className="grid sm:grid-cols-2 gap-5">
                {VALUES.map((v) => (
                  <div
                    key={v.title}
                    className="bg-white rounded-2xl border border-border shadow-card
                               hover:shadow-card-hover hover:-translate-y-0.5
                               transition-all duration-200 p-6 flex gap-5 items-start"
                  >
                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center
                                 text-2xl flex-shrink-0"
                      role="img"
                      aria-label={v.title}
                    >
                      {v.emoji}
                    </div>
                    {/* Text */}
                    <div>
                      <h3 className="font-bold text-primary mb-1.5">{v.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{v.body}</p>
                    </div>
                  </div>
                ))}
              </StaggerGrid>
            </section>

            {/* ── Timeline ────────────────────────────────────────── */}
            <section aria-label="Our history">
              <AnimateIn className="mb-8">
                <p className="section-eyebrow">Our story</p>
                <h2 className="mt-2 font-bold text-primary"
                    style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}>
                  A growing training centre
                </h2>
              </AnimateIn>

              <div className="relative">
                {/* Vertical rule — only visible at sm+ */}
                <div
                  className="absolute left-[31px] top-0 bottom-0 w-0.5 bg-border hidden sm:block"
                  aria-hidden="true"
                />

                <div className="space-y-6">
                  {TIMELINE.map((item, i) => (
                    <AnimateIn key={item.year} delay={i * 0.08}>
                      <div className="flex gap-5 items-start">
                        {/* Year badge */}
                        <div
                          className="w-16 h-16 flex-shrink-0 bg-primary text-white rounded-2xl
                                     flex items-center justify-center font-extrabold text-xs
                                     leading-tight text-center z-10 relative shadow-card"
                        >
                          {item.year}
                        </div>
                        {/* Card */}
                        <div
                          className="bg-white rounded-2xl border border-border shadow-card
                                     hover:shadow-card-hover hover:-translate-y-0.5
                                     transition-all duration-200 p-5 flex-1 min-w-0"
                        >
                          <h3 className="font-bold text-primary mb-1">{item.title}</h3>
                          <p className="text-sm text-gray-500 leading-relaxed">{item.body}</p>
                        </div>
                      </div>
                    </AnimateIn>
                  ))}
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
