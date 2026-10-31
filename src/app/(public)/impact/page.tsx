import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Heart, Users, Globe, Briefcase, BookOpen, MessageSquare } from "lucide-react";
import CTABand from "@/components/public/CTABand";
import ContactBand from "@/components/public/ContactBand";
import AnimateIn from "@/components/public/AnimateIn";
import StaggerGrid from "@/components/public/StaggerGrid";
import PageHero from "@/components/public/PageHero";
import { getContactInfo } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Impact",
  description: "How Musawo Training Center is transforming community health in Uganda by training home caregivers, childcare workers, mental health advocates and life support providers.",
};

const PURPOSE = [
  {
    icon: Heart,
    title: "Bringing care home",
    body: "Most Ugandan patients receive care at home, not in a hospital. Our graduates are the first trained healthcare workers many families ever meet. We equip them with clinical skills so that home care is safe, dignified and effective.",
  },
  {
    icon: Users,
    title: "Empowering women and youth",
    body: "Over 80% of our students are women and young people under 30. A Musawo certificate gives them a recognised professional qualification, better earnings and a career path in Uganda and abroad.",
  },
  {
    icon: Globe,
    title: "Serving communities across Uganda",
    body: "Our hybrid model combines online learning with hands-on practicals in our Kampala skills lab. Students travel from Wakiso, Mukono, Jinja, Mbarara and beyond to complete their training.",
  },
  {
    icon: Briefcase,
    title: "Job placement and opportunities abroad",
    body: "We connect graduates with healthcare employers in Uganda and with licensed recruitment agencies for opportunities abroad. Graduates go to work as home caregivers, childcare professionals, mental health advocates and emergency responders.",
  },
];

const FOLLOW_UP_POINTS = [
  "We track every graduate's employment status at 1, 3 and 6 months after graduation.",
  "Graduates can update their employment profile in the alumni portal.",
  "We share anonymised impact data with partner organisations and donors.",
  "Alumni are invited to mentor current students and return as guest instructors.",
  "International placements are supported through our licensed recruitment agency partners with pre-departure preparation.",
];

export default async function ImpactPage() {
  const contact = await getContactInfo();

  return (
    <div className="bg-surface">
      <PageHero
        image="/assets/images/musawo-session.webp"
        imageAlt="Musawo Training Center students in a community health training session"
        title="Our Impact"
        description="Musawo Training Center trains Uganda's community health workforce. Every graduate carries clinical skills back to their family, neighbourhood and community."
        breadcrumbs={[{ label: "Impact" }]}
        boxSide="right"
        objectPosition="center 30%"
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">

        {/* ── Purpose ─────────────────────────────────────────── */}
        <AnimateIn className="mb-4">
          <p className="section-eyebrow">Why it matters</p>
          <h2 className="mt-2 mb-3 font-bold text-balance" style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}>
            Our purpose
          </h2>
          <p className="text-gray-500 text-base leading-relaxed max-w-2xl mb-10">
            Uganda has a critical shortage of trained community health workers. Musawo Training Center was founded to close that gap -- one graduate at a time.
          </p>
        </AnimateIn>

        <StaggerGrid className="grid sm:grid-cols-2 gap-6 mb-16">
          {PURPOSE.map(({ icon: Icon, title, body }) => (
            <AnimateIn key={title}>
              <div className="bg-white rounded-2xl border border-border p-6 flex gap-5 hover:shadow-card-hover transition-shadow">
                <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-bold text-primary mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
                </div>
              </div>
            </AnimateIn>
          ))}
        </StaggerGrid>

        {/* ── Alumni follow-up ─────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-10 mb-16">
          <AnimateIn>
            <p className="section-eyebrow">Alumni follow-up</p>
            <h2 className="mt-2 mb-4 font-bold text-balance" style={{ fontSize: "clamp(1.5rem, 2.4vw, 2rem)" }}>
              We stay in touch after graduation
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Graduation is not the end. We follow up with every graduate to track employment outcomes and continue supporting their career.
            </p>
            <ul className="space-y-3 list-none">
              {FOLLOW_UP_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-gray-600 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-2" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </AnimateIn>

          <AnimateIn delay={0.1}>
            <div className="bg-primary rounded-2xl p-8 text-white flex flex-col justify-between h-full">
              <div>
                <MessageSquare className="w-8 h-8 text-accent mb-4" aria-hidden="true" />
                <h3 className="font-bold text-xl mb-3">Are you a graduate?</h3>
                <p className="text-white/70 text-sm leading-relaxed mb-6">
                  Tell us where you are working. Your story shows others what is possible and helps us improve our programmes.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <a
                  href={contact.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-600 text-white font-bold px-5 py-3 rounded-xl no-underline transition-colors text-sm"
                >
                  Share your story on WhatsApp <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>
                <a
                  href="mailto:info@musawo.ug"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-3 rounded-xl no-underline transition-colors text-sm"
                >
                  Email us at info@musawo.ug
                </a>
              </div>
            </div>
          </AnimateIn>
        </div>

        {/* ── Course link ──────────────────────────────────────── */}
        <AnimateIn>
          <div className="bg-[#F1F7F5] rounded-2xl border border-border p-6 sm:p-8 flex items-center gap-6 flex-wrap">
            <BookOpen className="w-8 h-8 text-primary flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-primary">Join the next intake</p>
              <p className="text-sm text-gray-500 mt-1">
                Applications are open for the November 2026 intake. Eight healthcare programmes available.
              </p>
            </div>
            <Link
              href="/apply"
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-600 text-white font-bold px-5 py-2.5 rounded-xl no-underline transition-all shadow-cta text-sm whitespace-nowrap flex-shrink-0"
            >
              Apply now <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </AnimateIn>

      </div>

      <CTABand
        heading="Be part of Uganda's community health story."
        subheading="Train with Musawo. Serve your community. Transform lives."
        primaryLabel="Apply now"
        primaryHref="/apply"
        whatsappUrl={contact.whatsappUrl}
      />
      <ContactBand whatsappUrl={contact.whatsappUrl} />
    </div>
  );
}
