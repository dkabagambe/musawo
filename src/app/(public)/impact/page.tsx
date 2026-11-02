import type { Metadata } from "next";
import { ArrowRight, MessageSquare } from "lucide-react";
import CTABand from "@/components/public/CTABand";
import ContactBand from "@/components/public/ContactBand";
import AnimateIn from "@/components/public/AnimateIn";

export const revalidate = 3600; // static content - cache 1 hour
import PageHero from "@/components/public/PageHero";
import { getContactInfo } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Impact",
  description: "How Musawo Training Center is transforming community health in Uganda by training home caregivers, childcare workers, mental health advocates and life support providers.",
};

const BENEFITS = [
  "Trained caregivers bring safe, dignified care directly to patients and families at home.",
  "Graduates gain a recognised professional qualification that opens career paths in Uganda and abroad.",
  "Our hybrid model makes quality healthcare training accessible outside major hospitals.",
  "We connect graduates with healthcare employers and support job placement after graduation.",
];

const FOLLOW_UP = [
  "We track graduate employment outcomes and continue supporting their careers after graduation.",
  "Graduates can update their employment profile and stay connected through our alumni network.",
  "Alumni are invited to mentor current students and return as guest instructors.",
  "International placements are supported through our licensed recruitment agency partners.",
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

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20 space-y-16">

        {/* ── 1. Purpose ───────────────────────────────────────── */}
        <AnimateIn>
          <p className="section-eyebrow">Why we exist</p>
          <h2 className="mt-2 mb-4 font-bold text-balance" style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}>
            Our purpose
          </h2>
          <p className="text-gray-500 text-base leading-relaxed max-w-2xl">
            Uganda has a critical shortage of trained community health workers. Musawo Training Center was founded to close that gap, one graduate at a time. We provide affordable hybrid and online healthcare training so that more Ugandans can serve their communities with confidence and skill.
          </p>
        </AnimateIn>

        {/* ── 2. Benefits to the community ─────────────────────── */}
        <AnimateIn>
          <p className="section-eyebrow">Community benefits</p>
          <h2 className="mt-2 mb-4 font-bold text-balance" style={{ fontSize: "clamp(1.5rem, 2.4vw, 2rem)" }}>
            Benefits to the community
          </h2>
          <ul className="space-y-3 list-none max-w-2xl">
            {BENEFITS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-gray-600 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-2" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </AnimateIn>

        {/* ── 3. Alumni follow-up ───────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-10">
          <AnimateIn>
            <p className="section-eyebrow">Alumni follow-up</p>
            <h2 className="mt-2 mb-4 font-bold text-balance" style={{ fontSize: "clamp(1.5rem, 2.4vw, 2rem)" }}>
              We stay in touch after graduation
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Graduation is not the end. We follow up with every graduate to track employment outcomes and continue supporting their career.
            </p>
            <ul className="space-y-3 list-none">
              {FOLLOW_UP.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-gray-600 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-2" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </AnimateIn>

          <AnimateIn>
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
