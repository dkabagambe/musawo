import Image from "next/image";
import Link from "next/link";
import PageHero from "@/components/public/PageHero";
import { CheckCircle, ArrowRight } from "lucide-react";
import AnimateIn from "@/components/public/AnimateIn";
import StaggerGrid from "@/components/public/StaggerGrid";
import CountUp from "@/components/public/CountUp";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about Musawo Training Center — bringing quality healthcare training to Ugandan communities since 2018.",
};

const TIMELINE = [
  { year: "2018", title: "Founded",       body: "ADFA — Allied Doctors and Friends of Uganda — established Musawo Training Center in Lungujja, Kampala." },
  { year: "2021", title: "First clinic",  body: "Opened the Lungujja community clinic providing testing, treatment and health education." },
  { year: "2023", title: "Licensed",      body: "Achieved full Ministry of Health and Ministry of Education & Sports accreditation for our nursing care programs." },
  { year: "2025", title: "Expansion",     body: "Launched online learning, extending accredited training to students across Uganda." },
];

const IMPACT = [
  { value: "1,000+", label: "Households served" },
  { value: "87+",    label: "Community health workers trained" },
  { value: "52+",    label: "Outreach events" },
  { value: "8",      label: "Years of service" },
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
        imageAlt="ADFA team collage — Musawo Training Center staff and community work"
        title="About Musawo Training Center"
        description="Bringing quality healthcare to Ugandan homes and communities through training, testing, treatment and trust since 2018."
        breadcrumbs={[{ label: "About" }]}
        boxSide="right"
        objectPosition="left center"
      />

      {/* Mission */}
      <section className="py-20 px-4 sm:px-6" aria-label="Our mission">
        <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-2 lg:gap-16 items-center">
          <AnimateIn>
            <p className="section-eyebrow">Who we are</p>
            <h2 className="text-3xl sm:text-4xl mt-2 mb-6">Training Uganda&apos;s community health workforce</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Musawo Training Center (MTC) is a division of Allied Doctors and Friends of Uganda (ADFA), a community health organisation based in Lungujja, Kampala. We provide accredited, affordable healthcare training to Ugandans who want to serve their communities.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              Our courses are fully accredited by Uganda&apos;s Ministry of Health and Ministry of Education and Sports. We train nursing care assistants, child safety workers, and community health workers — the backbone of Uganda&apos;s primary healthcare system.
            </p>
            <ul className="space-y-3 list-none mb-8">
              {[
                "Ministry of Health & Education accredited courses",
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
          <AnimateIn delay={0.15} className="mt-12 lg:mt-0 relative rounded-2xl overflow-hidden aspect-[4/3] shadow-xl">
            <Image
              src="/assets/images/mobile-care.webp"
              alt="Mobile healthcare worker providing community care in Uganda"
              fill
              className="object-cover"
            />
          </AnimateIn>
        </div>
      </section>

      {/* Impact stats */}
      <section className="bg-primary py-16 px-4 sm:px-6" aria-label="Impact numbers">
        <div className="max-w-5xl mx-auto">
          <AnimateIn className="text-center text-white text-2xl font-extrabold mb-10">
            Our impact in numbers
          </AnimateIn>
          <StaggerGrid className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center list-none">
            {IMPACT.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-2">
                <CountUp value={s.value} className="text-4xl font-extrabold text-accent" />
                <span className="text-white/70 text-sm">{s.label}</span>
              </div>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* Our values */}
      <section className="py-20 px-4 sm:px-6" aria-label="Our values">
        <div className="max-w-6xl mx-auto">
          <AnimateIn className="text-center mb-12">
            <p className="section-eyebrow">What drives us</p>
            <h2 className="text-3xl mt-2">Our values</h2>
          </AnimateIn>
          <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((v) => (
              <div key={v.title} className="bg-white rounded-2xl border border-border p-6 text-center hover:shadow-card-hover transition-shadow duration-200">
                <div className="text-4xl mb-4" role="img" aria-label={v.title}>{v.emoji}</div>
                <h3 className="font-bold text-primary mb-2">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.body}</p>
              </div>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 px-4 sm:px-6 bg-surface" aria-label="Our history">
        <div className="max-w-4xl mx-auto">
          <AnimateIn className="text-center mb-12">
            <p className="section-eyebrow">Our story</p>
            <h2 className="text-3xl mt-2">A decade of health-worker training</h2>
          </AnimateIn>
          <div className="relative">
            {/* Vertical line */}
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
        </div>
      </section>

      {/* Team photo */}
      <section className="py-20 px-4 sm:px-6" aria-label="Our facilities">
        <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-2 lg:gap-16 items-center">
          <AnimateIn className="relative rounded-2xl overflow-hidden aspect-[4/3] mb-10 lg:mb-0 shadow-xl">
            <Image
              src="/assets/images/graduates-field.webp"
              alt="Musawo Training Center graduates in the field"
              fill
              className="object-cover"
            />
          </AnimateIn>
          <AnimateIn delay={0.1}>
            <p className="section-eyebrow">Facilities &amp; partnerships</p>
            <h2 className="text-3xl sm:text-4xl mt-2 mb-6">Where learning meets practice</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Our Lungujja clinic provides the practical-day training environment where students apply their classroom learning with real patients and qualified clinical supervisors.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              We partner with healthcare facilities across Kampala to support graduate placement and internship opportunities, ensuring our students transition smoothly from training to employment.
            </p>
            <Link href="/contact" className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:text-accent no-underline transition-colors">
              Get in touch <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </AnimateIn>
        </div>
      </section>

      {/* Accreditation strip */}
      <section className="py-10 px-4 sm:px-6 bg-surface" aria-label="Accreditation">
        <div className="max-w-4xl mx-auto">
          <AnimateIn>
            <div className="bg-white border border-border rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
              <div className="flex items-center gap-3 text-sm font-bold text-primary">
                <CheckCircle className="w-5 h-5 text-success flex-shrink-0" aria-hidden="true" />
                Ministry of Health Uganda
              </div>
              <div className="hidden sm:block w-px h-8 bg-border" aria-hidden="true" />
              <div className="flex items-center gap-3 text-sm font-bold text-primary">
                <CheckCircle className="w-5 h-5 text-success flex-shrink-0" aria-hidden="true" />
                Ministry of Education &amp; Sports, Uganda
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>
    </div>
  );
}
