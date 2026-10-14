
import Link from "next/link";
import PageHero from "@/components/public/PageHero";
import CTABand from "@/components/public/CTABand";
import ContactBand from "@/components/public/ContactBand";
import SideNav from "@/components/public/SideNav";
import { CheckCircle, ArrowRight } from "lucide-react";
import AnimateIn from "@/components/public/AnimateIn";
import StaggerGrid from "@/components/public/StaggerGrid";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about Musawo Training Center - bringing quality healthcare training to Ugandan communities since 2018.",
};

const ABOUT_NAV = [
  { label: "About MTC",     href: "/about" },
  { label: "Accreditation", href: "/about/accreditation" },
  { label: "Our trainers",  href: "/about/trainers" },
  { label: "FAQ",           href: "/faq" },
];

const TIMELINE = [
  { year: "2018", title: "Founded",       body: "ADFA, Allied Doctors and Friends of Uganda, established Musawo Training Center in Lungujja, Kampala." },
  { year: "2021", title: "First clinic",  body: "Opened the Lungujja community clinic providing testing, treatment and health education." },
  { year: "2023", title: "Licensed",      body: "Achieved full Ministry of Health and Ministry of Education and Sports accreditation for our nursing care programs." },
  { year: "2025", title: "Expansion",     body: "Launched online learning, extending accredited training to students across Uganda." },
];

const VALUES = [
  { emoji: "🤲", title: "Compassion",    body: "We put the dignity and wellbeing of patients, students and communities at the heart of everything we do." },
  { emoji: "🎓", title: "Excellence",    body: "We hold our training to the highest national standards, ensuring every graduate is ready for clinical practice." },
  { emoji: "🌍", title: "Accessibility", body: "Affordable fees, mobile-first learning, and scholarship programmes ensure no one is excluded because of cost." },
  { emoji: "🤝", title: "Community",     body: "We are rooted in Ugandan communities and measure our success by the health of the people our graduates serve." },
];

export default function AboutPage() {
  return (
    <div className="bg-surface">
      <PageHero
        image="/assets/images/hero-about.webp"
        imageAlt="ADFA team collage - Musawo Training Center staff and community work"
        title="About Musawo Training Center"
        description="Bringing quality healthcare to Ugandan homes and communities through training, testing, treatment and trust since 2018."
        breadcrumbs={[{ label: "About" }]}
        boxSide="right"
        objectPosition="left center"
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
        <div className="flex gap-12 items-start">
          <SideNav title="About" items={ABOUT_NAV} />

          <div className="flex-1 min-w-0">

      {/* Mission */}
      <section className="mb-16" aria-label="Our mission">
          <AnimateIn>
            <p className="section-eyebrow">Who we are</p>
            <h2 className="mt-2 mb-6" style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}>Training Uganda&apos;s community health workforce</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Musawo Training Center (MTC) is a division of Allied Doctors and Friends of Uganda (ADFA), a community health organisation based in Lungujja, Kampala. We provide accredited, affordable healthcare training to Ugandans who want to serve their communities.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              Our courses are fully accredited by Uganda&apos;s Ministry of Health and Ministry of Education and Sports. We train nursing care assistants, child safety workers, and community health workers - the backbone of Uganda&apos;s primary healthcare system.
            </p>
            <ul className="space-y-3 list-none mb-8">
              {[
                "Ministry of Health and Education accredited courses",
                "Designed for mobile learning on any device",
                "Flexible instalment payment plans",
                "Practical days at our Lungujja clinic",
                "Employment support for graduates",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-gray-600">
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/courses" className="inline-flex items-center gap-2 bg-accent hover:bg-accent-600 text-white font-bold px-7 py-3 rounded-xl no-underline transition-colors shadow-cta">
              Browse our courses <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </AnimateIn>
      </section>

      {/* Our values */}
      <section className="mb-16" aria-label="Our values">
          <AnimateIn className="mb-8">
            <p className="section-eyebrow">What drives us</p>
            <h2 className="mt-2" style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}>Our values</h2>
          </AnimateIn>
          <StaggerGrid className="grid sm:grid-cols-2 gap-5">
            {VALUES.map((v) => (
              <div key={v.title} className="bg-white rounded-2xl border border-border p-6 text-center hover:shadow-card-hover transition-shadow duration-200">
                <div className="text-4xl mb-4" role="img" aria-label={v.title}>{v.emoji}</div>
                <h3 className="font-bold text-primary mb-2">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.body}</p>
              </div>
            ))}
          </StaggerGrid>
      </section>

      {/* Timeline */}
      <section className="mb-16" aria-label="Our history">
          <AnimateIn className="mb-8">
            <p className="section-eyebrow">Our story</p>
            <h2 className="mt-2" style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}>A decade of health-worker training</h2>
          </AnimateIn>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border hidden sm:block" aria-hidden="true" />
            <div className="space-y-8">
              {TIMELINE.map((item, i) => (
                <AnimateIn key={item.year} delay={i * 0.1}>
                  <div className="sm:flex gap-8 items-start">
                    <div className="flex-shrink-0 flex items-center gap-4 mb-3 sm:mb-0">
                      <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center font-extrabold text-sm z-10 relative shadow-primary-glow">
                        {item.year}
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-border p-6 flex-1 hover:shadow-card-hover transition-shadow">
                      <h3 className="font-bold text-primary mb-2">{item.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{item.body}</p>
                    </div>
                  </div>
                </AnimateIn>
              ))}
            </div>
          </div>
      </section>

      {/* Accreditation strip */}
      <section aria-label="Accreditation">
          <AnimateIn>
            <div className="bg-white border border-border rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
              <div className="flex items-center gap-3 text-sm font-bold text-primary">
                <CheckCircle className="w-5 h-5 text-success flex-shrink-0" aria-hidden="true" />
                Ministry of Health Uganda
              </div>
              <div className="hidden sm:block w-px h-8 bg-border" aria-hidden="true" />
              <div className="flex items-center gap-3 text-sm font-bold text-primary">
                <CheckCircle className="w-5 h-5 text-success flex-shrink-0" aria-hidden="true" />
                Ministry of Education and Sports, Uganda
              </div>
            </div>
          </AnimateIn>
      </section>

          </div>
        </div>
      </div>

      <CTABand
        heading="Ready to join our community?"
        subheading="Accredited training designed for Ugandans who want to serve."
        whatsappUrl="https://wa.me/256785423523"
      />
      <ContactBand />
    </div>
  );
}
