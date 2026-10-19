import PageHero from "@/components/public/PageHero";
import CTABand from "@/components/public/CTABand";
import ContactBand from "@/components/public/ContactBand";
import SideNav from "@/components/public/SideNav";
import AnimateIn from "@/components/public/AnimateIn";
import { getContactInfo } from "@/lib/contact";
import { CheckCircle, ArrowRight, UserPlus, CreditCard, FileText, GraduationCap } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to Enrol",
  description: "Step-by-step guide to applying and enrolling in a healthcare course at Musawo Training Center. November 2026 intake.",
};

const ADMISSIONS_NAV = [
  { label: "How to enrol",         href: "/admissions/how-to-enrol" },
  { label: "Fees and instalments", href: "/admissions/fees" },
  { label: "Payment options",      href: "/admissions/payment-options" },
];

const STEPS = [
  {
    n: "01", icon: FileText,
    title: "Choose your course",
    body: "Browse our seven healthcare programmes and read what is included, the duration, category and fee. Not sure which to pick? Chat with us on WhatsApp.",
    cta: { label: "Browse courses", href: "/courses" },
  },
  {
    n: "02", icon: UserPlus,
    title: "Submit an application",
    body: "Fill in the online application form. You will receive a confirmation email. The Academic Registrar reviews applications and responds within 3 to 5 working days.",
    cta: { label: "Apply now", href: "/apply" },
  },
  {
    n: "03", icon: CreditCard,
    title: "Accept your place and pay",
    body: "If accepted, you will receive a secure account activation link by email. Confirm your details, set a password, then pay with MTN MoMo, Airtel Money or bank transfer.",
    cta: { label: "See payment options", href: "/admissions/payment-options" },
  },
  {
    n: "04", icon: GraduationCap,
    title: "Start learning",
    body: "Once payment is confirmed, your course content unlocks. Join live classes, attend practicals in our skills lab, and work towards your certificate.",
    cta: null,
  },
];

const REQUIREMENTS = [
  "Most courses are open to all: PLE leavers, S.4 and S.6 leavers, working carers, teachers and community workers.",
  "Medical Home Caregiver and Advanced Life Support require a professional nursing, midwifery or clinical officer qualification and registration number.",
  "You must have a valid Ugandan phone number to receive SMS alerts.",
  "A smartphone with internet access is required for online classes. MTN or Airtel data is sufficient.",
  "All course materials are in English; a basic ability to read and write in English is needed.",
  "We do not provide accommodation. Students attend practicals from their own residence.",
];

export default async function HowToEnrolPage() {
  const contact = await getContactInfo();

  return (
    <div>
      <PageHero
        image="/assets/images/hero-courses.webp"
        imageAlt="Students attending a Musawo Training Center skills lab session"
        title="How to Enrol"
        description="Applying to Musawo Training Center takes a few minutes. Follow these four steps to secure your place in the November 2026 intake."
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

            <AnimateIn className="mb-4">
              <p className="section-eyebrow">Simple process</p>
              <h2 className="mt-2 mb-3 font-bold text-balance" style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}>
                Four steps to your first lesson
              </h2>
              <p className="text-gray-500 text-base leading-relaxed max-w-xl">
                Applications are reviewed by the Academic Registrar. There is no self-registration; your account is created after your application is accepted.
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

            <AnimateIn className="mt-14">
              <h2 className="font-bold text-primary mb-5" style={{ fontSize: "clamp(1.25rem, 2vw, 1.625rem)" }}>
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

            <AnimateIn className="mt-10">
              <div className="bg-primary/5 border border-primary/15 rounded-2xl p-6">
                <h3 className="font-bold text-primary mb-2">November 2026 intake</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Applications are now open for the <strong>November 2026</strong> intake. Places are limited. Apply early to avoid missing out.
                </p>
                <Link
                  href="/apply"
                  className="inline-flex items-center gap-2 mt-4 bg-accent hover:bg-accent-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl no-underline transition-all shadow-cta"
                >
                  Apply now <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            </AnimateIn>

          </div>
        </div>
      </div>

      <CTABand
        heading="Ready to apply?"
        subheading="Submit your application for the November 2026 intake. Hybrid classes with 70% hands-on practicals."
        primaryLabel="Apply now"
        primaryHref="/apply"
        whatsappUrl={contact.whatsappUrl}
      />
      <ContactBand whatsappUrl={contact.whatsappUrl} />
    </div>
  );
}
