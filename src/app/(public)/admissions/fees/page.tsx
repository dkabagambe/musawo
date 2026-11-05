import PageHero from "@/components/public/PageHero";
import SideNav from "@/components/public/SideNav";
import AnimateIn from "@/components/public/AnimateIn";
import { CheckCircle, ArrowRight, Download } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fees and Instalments",
  description: "How to pay for your Musawo Training Center course. Flexible three-phase instalment plan for all courses.",
};

const ADMISSIONS_NAV = [
  { label: "How to enrol",         href: "/admissions/how-to-enrol" },
  { label: "Fees and instalments", href: "/admissions/fees" },
  { label: "Payment options",      href: "/admissions/payment-options" },
];

const INCLUDED_ALL = [
  "Full course access on all devices",
  "Hybrid and online classes with hands-on practicals in our skills lab",
  "All assessments and examinations",
  "Job placement support",
];

const INSTALMENT_PLAN = [
  {
    pct: "50%",
    phase: "Phase 1",
    label: "Before reporting",
    desc: "Pay 50% of your course fee before your first class. This confirms your place and gives you access to the first phase of course content.",
  },
  {
    pct: "25%",
    phase: "Phase 2",
    label: "Midway through the course",
    desc: "Pay the second instalment to continue without interruption and unlock practical booking.",
  },
  {
    pct: "25%",
    phase: "Phase 3",
    label: "Before the final assessment",
    desc: "Clear the remaining balance to unlock the final exam and your certificate.",
  },
];

export default async function FeesPage() {

  return (
    <div>
      <PageHero
        image="/assets/images/hero-about.webp"
        imageAlt="Musawo Training Center skills lab"
        title="Fees and Instalments"
        description="Contact admissions for current course fees. All courses use the same flexible three-phase payment plan."
        breadcrumbs={[
          { label: "Admissions", href: "/admissions/how-to-enrol" },
          { label: "Fees and instalments" },
        ]}
        boxSide="left"
        objectPosition="center center"
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
        <div className="flex gap-12 items-start">
          <SideNav title="Admissions" items={ADMISSIONS_NAV} />

          <div className="flex-1 min-w-0">

            {/* ── Fees structure PDF download ───────────────────── */}
            <AnimateIn className="mb-10">
              <div className="bg-primary text-white rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-lg mb-1">Fees Structure</p>
                  <p className="text-white/70 text-sm">
                    Download the full fees structure for all courses (PDF).
                  </p>
                </div>
                <a
                  href="/assets/FEES_STRUCTURE_MTC.pdf"
                  download="MTC-Fees-Structure.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-primary font-bold px-5 py-2.5 rounded-xl no-underline transition-colors text-sm flex-shrink-0"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  Download fees PDF
                </a>
              </div>
            </AnimateIn>

            {/* ── Payment plan ──────────────────────────────────── */}
            <AnimateIn className="mb-12">
              <p className="section-eyebrow">Payment plan</p>
              <h2 className="mt-2 mb-3 font-bold text-balance" style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}>
                How to pay in instalments
              </h2>
              <p className="text-gray-500 text-base leading-relaxed max-w-xl mb-8">
                The same plan applies to all courses. Fees are paid in three phases. No other payment arrangement is accepted.
              </p>

              <div className="grid sm:grid-cols-3 gap-5">
                {INSTALMENT_PLAN.map(({ pct, phase, label, desc }) => (
                  <div
                    key={phase}
                    className="bg-white rounded-2xl border border-border p-6 flex flex-col items-center text-center hover:shadow-card-hover transition-shadow"
                  >
                    <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-4">
                      <span className="text-accent font-extrabold text-xl">{pct}</span>
                    </div>
                    <p className="font-bold text-primary text-sm mb-1">{phase}</p>
                    <p className="text-sm font-semibold text-gray-700 mb-2">{label}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 bg-[#F1F7F5] rounded-2xl border border-border p-5 text-sm text-gray-600">
                <p className="font-semibold text-primary mb-1">How content access works</p>
                <p>
                  Paying 50% unlocks the first phase of content and confirms your place. Reaching 75% unlocks the next phase and practical booking. Paying in full opens the final exam and your certificate.
                </p>
              </div>
            </AnimateIn>

            {/* ── What is included ─────────────────────────────── */}
            <AnimateIn className="mb-12">
              <h3 className="font-bold text-primary text-base mb-4">What is included in every course</h3>
              <ul className="space-y-2.5 list-none">
                {INCLUDED_ALL.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600 leading-relaxed">
                    <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </AnimateIn>

            {/* ── Fee enquiries ─────────────────────────────────── */}
            <AnimateIn>
              <div className="bg-surface border border-border rounded-2xl p-5 text-sm text-gray-600">
                <p className="font-semibold text-primary mb-1">Fee enquiries</p>
                <p className="mb-3">
                  For current fees and payment arrangements, contact admissions at{" "}
                  <a href="mailto:admissions@mtc.ac.ug" className="text-primary no-underline hover:underline">
                    admissions@mtc.ac.ug
                  </a>{" "}
                  or call{" "}
                  <a href="tel:+256709184468" className="text-primary no-underline hover:underline">
                    0709 184 468
                  </a>. International students pay in USD at a rate of UGX 3,600 per USD.
                </p>
                <Link
                  href="/admissions/payment-options"
                  className="inline-flex items-center gap-1.5 text-accent font-semibold hover:text-accent-600 no-underline transition-colors"
                >
                  See payment options <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            </AnimateIn>

          </div>
        </div>
      </div>

    </div>
  );
}
