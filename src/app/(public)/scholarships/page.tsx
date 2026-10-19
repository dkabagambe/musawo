import { notFound } from "next/navigation";
import PageHero from "@/components/public/PageHero";
import Link from "next/link";
import { ArrowRight, CheckCircle, HeartHandshake, GraduationCap, BookOpen } from "lucide-react";
import { getContactInfo } from "@/lib/contact";
import { getSetting } from "@/lib/settings";
import AnimateIn from "@/components/public/AnimateIn";
import StaggerGrid from "@/components/public/StaggerGrid";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scholarships and Financial Aid",
  description: "Learn about scholarships and subsidised places available at Musawo Training Center for Ugandan healthcare students.",
};

const SCHOLARSHIP_TYPES = [
  {
    icon: HeartHandshake,
    title: "Full scholarship",
    badge: "Full fee covered",
    badgeColor: "bg-success/10 text-success",
    description:
      "Covers 100% of the course fee. Awarded to candidates who demonstrate both financial need and strong motivation to serve their community as a health worker.",
    criteria: [
      "Demonstrated financial hardship",
      "Strong personal statement",
      "Commitment to working in an underserved community",
      "Recommendation from a community leader or health worker",
    ],
  },
  {
    icon: GraduationCap,
    title: "Subsidised place",
    badge: "50% fee reduction",
    badgeColor: "bg-accent/10 text-accent",
    description:
      "Covers 50% of the course fee. Available to candidates who cannot afford the full fee but can contribute towards their training costs.",
    criteria: [
      "Demonstrated partial financial need",
      "Commitment to completing the course",
      "Brief personal statement explaining your situation",
    ],
  },
  {
    icon: BookOpen,
    title: "Instalment plan",
    badge: "Pay in 3 parts",
    badgeColor: "bg-primary/10 text-primary",
    description:
      "Not a scholarship, but our flexible payment plan is available to all students - pay 25% upfront and the rest in two further instalments as you progress through the course.",
    criteria: [
      "Available to every enrolled student",
      "No application required - select at checkout",
      "Each instalment unlocks the next course block",
    ],
  },
];

const PROCESS = [
  { n: "01", title: "Apply when you register", body: "Tick the scholarship option during registration and complete the short application form. It takes about 5 minutes." },
  { n: "02", title: "Our team reviews your application", body: "The admissions team reviews all scholarship applications within 3-5 working days of the enrolment deadline." },
  { n: "03", title: "You receive a decision by email", body: "We will notify you of the outcome by email and SMS. Successful applicants receive a scholarship code to apply at checkout." },
  { n: "04", title: "Start learning", body: "Apply your scholarship code, confirm your place, and start your course on the intake start date." },
];

export default async function ScholarshipsPage() {
  const [contact, scholarshipsEnabled] = await Promise.all([
    getContactInfo(),
    getSetting("feature.scholarships", "false"),
  ]);

  // Scholarships are disabled by default (SCHOLARSHIPS_ENABLED=false).
  // When the setting is not "true", this page returns 404.
  if (scholarshipsEnabled !== "true") {
    notFound();
  }

  return (
    <div className="bg-surface">
      <PageHero
        image="/assets/community-outreach.webp"
        imageAlt="Musawo Training Center community health workers"
        title="Scholarships & Financial Aid"
        description="Cost should never stop anyone from becoming a health worker. We reserve scholarship and subsidised places every intake."
        breadcrumbs={[{ label: "Scholarships" }]}
        cta={{ label: "Apply when you register", href: "/register?scholarship=1" }}
        boxSide="left"
        objectPosition="right center"
      />

      {/* Scholarship types */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20" aria-label="Types of financial support">
        <AnimateIn className="text-center mb-12">
          <p className="section-eyebrow">Financial support</p>
          <h2 className="text-3xl sm:text-4xl mt-2">Ways we make training affordable</h2>
          <p className="section-lead mx-auto text-center mt-3">
            Every intake we allocate a limited number of full scholarships and subsidised places alongside our flexible instalment plan.
          </p>
        </AnimateIn>

        <StaggerGrid className="grid md:grid-cols-3 gap-6">
          {SCHOLARSHIP_TYPES.map(({ icon: Icon, title, badge, badgeColor, description, criteria }) => (
            <div key={title} className="bg-white rounded-2xl border border-border p-6 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeColor}`}>{badge}</span>
              </div>
              <h3 className="font-bold text-primary text-base mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4 flex-1">{description}</p>
              <ul className="space-y-2 list-none mt-auto">
                {criteria.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </StaggerGrid>
      </section>

      {/* How it works */}
      <section className="bg-white border-y border-border py-20 px-4 sm:px-6" aria-label="Scholarship application process">
        <div className="max-w-6xl mx-auto">
          <AnimateIn className="text-center mb-12">
            <p className="section-eyebrow">How to apply</p>
            <h2 className="text-3xl mt-2">The scholarship process</h2>
          </AnimateIn>

          <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROCESS.map(({ n, title, body }) => (
              <div key={n} className="bg-surface rounded-2xl border border-border p-6 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
                <span className="text-xs font-extrabold text-accent/60 tracking-widest block mb-3">{n}</span>
                <h3 className="font-bold text-primary mb-2 text-sm">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* Eligibility note */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16" aria-label="Eligibility and important notes">
        <AnimateIn>
          <div className="bg-primary/5 border border-primary/15 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-primary mb-4">Important notes</h2>
            <ul className="space-y-3 list-none text-sm text-gray-600">
              {[
                "Scholarship places are limited. Applying does not guarantee a scholarship, so we encourage all applicants to also consider the instalment plan as a backup.",
                "Scholarships are awarded per intake. An unsuccessful application in one intake does not affect future applications.",
                "Scholarship recipients must complete the course to retain the award. Withdrawing without a compelling reason may affect eligibility for future intakes.",
                "All course academic requirements - assessments, attendance, and the final examination - apply equally to scholarship students.",
                "Musawo Training Center reserves the right to request supporting documentation (such as a letter from a community leader) before confirming a full scholarship.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </AnimateIn>
      </section>

      {/* CTA */}
      <section className="bg-primary py-20 px-4 sm:px-6 text-center" aria-label="Apply now">
        <AnimateIn>
          <p className="section-eyebrow text-accent">Ready to apply?</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4">
            Start your application today
          </h2>
          <p className="text-white/75 max-w-md mx-auto mb-8 leading-relaxed">
            Tick the scholarship option when you register. Our team will review your application and respond within 3-5 working days.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register?scholarship=1"
              className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-600 text-white font-bold text-base px-8 py-3.5 rounded-xl no-underline transition-all shadow-cta"
            >
              Apply when registering <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <a
              href={contact.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold text-base px-8 py-3.5 rounded-xl no-underline transition-all"
            >
              💬 Ask on WhatsApp
            </a>
          </div>
        </AnimateIn>
      </section>
    </div>
  );
}
