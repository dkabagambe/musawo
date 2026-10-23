import Link from "next/link";
import PageHero from "@/components/public/PageHero";
import CTABand from "@/components/public/CTABand";
import ContactBand from "@/components/public/ContactBand";
import SideNav from "@/components/public/SideNav";
import { CheckCircle, ArrowRight } from "lucide-react";
import AnimateIn from "@/components/public/AnimateIn";
import StaggerGrid from "@/components/public/StaggerGrid";
import { getSetting } from "@/lib/settings";
import { getContactInfo } from "@/lib/contact";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Musawo Training Center - hybrid and online healthcare training with 70% hands-on practicals. Serving Ugandan communities since 2018.",
};

const ABOUT_NAV = [
  { label: "About MTC",    href: "/about" },
  { label: "Our trainers", href: "/about/trainers" },
  { label: "FAQ",          href: "/faq" },
];

const TIMELINE = [
  { year: "2018", title: "Founded", body: "ADFA, Allied Doctors and Friends of Uganda, established Musawo Training Center in Kampala to train community health workers." },
  { year: "2021", title: "Skills lab", body: "Opened the dedicated skills lab for hands-on practical training, enabling the hybrid delivery model." },
  { year: "2023", title: "Growth", body: "Expanded training programmes and grew the network of community health workers across Kampala and surrounding districts." },
  { year: "2025", title: "Online platform", body: "Launched the online learning platform, extending training to students across Uganda with hybrid classes." },
  { year: "2026", title: "Eight programmes", body: "Expanded to eight healthcare programmes covering nursing care, childcare, mental health, geriatric care and life support." },
];

const VALUES = [
  { emoji: "🤲", title: "Compassion",    body: "We put the dignity and wellbeing of patients, students and communities at the heart of everything we do." },
  { emoji: "🎓", title: "Excellence",    body: "We hold our training to high standards, ensuring every graduate is ready for clinical practice." },
  { emoji: "🌍", title: "Accessibility", body: "Affordable fees, hybrid learning, and flexible instalments ensure no one is excluded because of cost." },
  { emoji: "🤝", title: "Community",     body: "We are rooted in Ugandan communities and measure our success by the health of the people our graduates serve." },
];

export default async function AboutPage() {
  const [accreditationText, contact] = await Promise.all([
    getSetting("site.accreditationText", ""),
    getContactInfo(),
  ]);

  return (
    <div className="bg-surface">
      <PageHero
        image="/assets/images/hero-about.webp"
        imageAlt="Musawo Training Center staff and skills lab"
        title="About Musawo Training Center"
        description="Hybrid and online healthcare training with 70% hands-on practicals in our skills lab. Taught by doctors, nurses and clinicians. Serving Ugandan communities since 2018."
        breadcrumbs={[{ label: "About" }]}
        boxSide="right"
        objectPosition="left center"
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
        <div className="flex gap-12 items-start">
          <SideNav title="About" items={ABOUT_NAV} />

          <div className="flex-1 min-w-0">

            {/* Mission */}
            <section className="mb-16" aria-label="Who we are">
              <AnimateIn>
                <p className="section-eyebrow">Who we are</p>
                <h2 className="mt-2 mb-6" style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}>
                  Training Uganda&apos;s community health workforce
                </h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Musawo Training Center (MTC) is a division of Allied Doctors and Friends of Uganda (ADFA), a community health organisation based in Kampala. We provide affordable hybrid and online healthcare training to Ugandans who want to serve their communities.
                </p>
                <p className="text-gray-600 leading-relaxed mb-4 font-medium text-primary/90">
                  Our mission: to equip women and youth with practical, high-quality healthcare skills through innovative training, mentorship, and values-based education -- producing competent caregivers who bring safe, compassionate, and affordable care directly to patients, families and communities.
                </p>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Our eight programmes cover home caregiving, childcare and safety, mental health support, geriatric care, and life support. All courses combine online classes with 70% hands-on practicals in our skills lab, taught by doctors, nurses and clinicians.
                </p>
                <ul className="space-y-3 list-none mb-8">
                  {[
                    "Hybrid and online classes with 70% hands-on practicals",
                    "Taught by doctors, nurses and clinicians",
                    "Pay with MTN, Airtel or bank transfer",
                    "Digital certificate with QR verification",
                    "Flexible instalment payment plans",
                    "Job placement support in Uganda",
                    "Job opportunities abroad through licensed recruitment agencies",
                    "We do not provide accommodation",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-gray-600">
                      <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 bg-accent hover:bg-accent-600 text-white font-bold px-7 py-3 rounded-xl no-underline transition-colors shadow-cta"
                >
                  Browse our courses <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </AnimateIn>
            </section>

            {/* Accreditation block - only shown when the setting is filled */}
            {accreditationText && (
              <section className="mb-16" aria-label="Accreditation">
                <AnimateIn>
                  <div className="bg-white border border-border rounded-2xl px-6 py-5">
                    <div className="flex items-center gap-3 text-sm font-bold text-primary">
                      <CheckCircle className="w-5 h-5 text-success flex-shrink-0" aria-hidden="true" />
                      {accreditationText}
                    </div>
                  </div>
                </AnimateIn>
              </section>
            )}

            {/* Values */}
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
                <h2 className="mt-2" style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}>A growing training centre</h2>
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

          </div>
        </div>
      </div>

      <CTABand
        heading="Ready to start your healthcare career?"
        subheading="Apply for the November 2026 intake. Hybrid classes with hands-on practicals in our skills lab."
        primaryLabel="Apply now"
        primaryHref="/apply"
        whatsappUrl={contact.whatsappUrl}
      />
      <ContactBand whatsappUrl={contact.whatsappUrl} />
    </div>
  );
}
