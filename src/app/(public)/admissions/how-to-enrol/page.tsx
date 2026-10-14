import PageHero from "@/components/public/PageHero";
import CTABand from "@/components/public/CTABand";
import ContactBand from "@/components/public/ContactBand";
import SideNav from "@/components/public/SideNav";
import AnimateIn from "@/components/public/AnimateIn";
import StaggerGrid from "@/components/public/StaggerGrid";
import { getContactInfo } from "@/lib/contact";
import { CheckCircle, ArrowRight, UserPlus, CreditCard, FileText, GraduationCap } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to Enrol",
  description: "Step-by-step guide to enrolling in an accredited healthcare course at Musawo Training Center.",
};

const ADMISSIONS_NAV = [
  { label: "How to enrol",         href: "/admissions/how-to-enrol" },
  { label: "Fees and instalments", href: "/admissions/fees" },
  { label: "Scholarships",         href: "/scholarships" },
  { label: "Payment options",      href: "/admissions/payment-options" },
];

const STEPS = [
  {
    n: "01", icon: FileText,
    title: "Choose your course",
    body: "Browse our three accredited programmes and read what is included, the duration, and the fee. Not sure which to pick? Chat with us on WhatsApp.",
    cta: { label: "Browse courses", href: "/courses" },
  },
  {
    n: "02", icon: UserPlus,
    title: "Register an account",
    body: "Click Enrol now and create your learner account. It takes under two minutes. If you are applying for a scholarship, tick that option on the registration form.",
    cta: { label: "Create account", href: "/register" },
  },
  {
    n: "03", icon: CreditCard,
    title: "Pay your course fee",
    body: "Pay the full fee or the first instalment using MTN MoMo, Airtel Money, bank transfer, or card. Your place is confirmed once payment is received.",
    cta: { label: "See payment options", href: "/admissions/payment-options" },
  },
  {
    n: "04", icon: GraduationCap,
    title: "Start learning",
    body: "You will receive your login credentials and course access by email on the intake start date. Your tutor will contact you to introduce the first live class.",
    cta: null,
  },
];

const REQUIREMENTS = [
  "You must be 18 years old or older.",
  "You must own a smartphone with internet access (MTN or Airtel data is sufficient).",
  "You must speak and read basic English, as all course materials are in English.",
  "No prior healthcare qualifications are required for any of our programmes.",
  "You must have a valid Ugandan phone number to receive SMS alerts and payment codes.",
];

export default async function HowToEnrolPage() {
  const contact = await getContactInfo();

  return (
    <div>
      <PageHero
        image="/assets/images/hero-courses.webp"
        imageAlt="Students learning on mobile devices at Musawo Training Center"
        title="How to Enrol"
        description="Joining Musawo Training Center takes less than five minutes. Follow these four simple steps to secure your place."
        breadcrumbs={[
          { label: "Admissions", href: "/admissions/how-to-enrol" },
          { label: "How to enrol" },
        ]}
        boxSide="left"
        objectPosition="center right"
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
        <div className="flex gap-12 items-start">
          <SideNav title="Admissions" items={ADMISSIONS_NAV} />

          <div className="flex-1 min-w-0">

            {/* Steps */}
            <AnimateIn className="mb-4">
              <p className="section-eyebrow">Simple process</p>
              <h2
                className="mt-2 mb-3 font-bold text-balance"
                style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}
              >
                Four steps to your first lesson
              </h2>
              <p className="text-gray-500 text-base leading-relaxed max-w-xl">
                Everything happens online. No need to visit our offices.
              </p>
            </AnimateIn>

            <div className="mt-10 space-y-6">
              {STEPS.map(({ n, icon: Icon, title, body, cta }, i) => (
                <AnimateIn key={n} delay={i * 0.08}>
                  <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 flex gap-6 items-start hover:shadow-card-hover transition-shadow">
                    <div className="flex-shrink-0 flex flex-col items-center gap-2">
                      <span className="text-xs font-extrabold text-accent/60 tracking-widest">{n}</span>
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-primary text-base mb-2">{title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed mb-3">{body}</p>
                      {cta && (
                        <Link
                          href={cta.href}
                          className="inline-flex items-center gap-1.5 text-accent font-semibold text-sm hover:text-accent-600 no-underline transition-colors"
                        >
                          {cta.label} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  </div>
                </AnimateIn>
              ))}
            </div>

            {/* Entry requirements */}
            <AnimateIn className="mt-14">
              <h2
                className="font-bold text-primary mb-5"
                style={{ fontSize: "clamp(1.25rem, 2vw, 1.625rem)" }}
              >
                Entry requirements
              </h2>
              <div className="bg-[#F1F7F5] rounded-2xl border border-border p-6 sm:p-8">
                <ul className="space-y-3 list-none">
                  {REQUIREMENTS.map((req) => (
                    <li key={req} className="flex items-start gap-3 text-sm text-gray-600 leading-relaxed">
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimateIn>

            {/* Intake dates */}
            <AnimateIn className="mt-10">
              <div className="bg-primary/5 border border-primary/15 rounded-2xl p-6">
                <h3 className="font-bold text-primary mb-2">Upcoming intake</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  The next intake starts in <strong>January 2027</strong>. Enrolment closes when all places are filled, so we recommend registering early to secure your spot.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 mt-4 bg-accent hover:bg-accent-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl no-underline transition-all shadow-cta"
                >
                  Reserve my place <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            </AnimateIn>

          </div>
        </div>
      </div>

      <CTABand
        heading="Ready to enrol?"
        subheading="Join the January 2027 intake. Four steps, five minutes."
        whatsappUrl={contact.whatsappUrl}
      />
      <ContactBand whatsappUrl={contact.whatsappUrl} />
    </div>
  );
}
