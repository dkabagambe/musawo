import PageHero from "@/components/public/PageHero";
import CTABand from "@/components/public/CTABand";
import ContactBand from "@/components/public/ContactBand";
import SideNav from "@/components/public/SideNav";
import AnimateIn from "@/components/public/AnimateIn";
import { getContactInfo } from "@/lib/contact";
import { CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Fees and Instalments",
  description: "Course fees and flexible instalment options at Musawo Training Center Uganda. November 2026 intake.",
};

const ADMISSIONS_NAV = [
  { label: "How to enrol",         href: "/admissions/how-to-enrol" },
  { label: "Fees and instalments", href: "/admissions/fees" },
  { label: "Payment options",      href: "/admissions/payment-options" },
];

const INCLUDED_ALL = [
  "Full course access on all devices",
  "Hybrid and online classes with 70% hands-on practicals in our skills lab",
  "All assessments and examinations",
  "Digital certificate with QR verification",
  "Job placement support",
];

const INSTALMENT_PLAN = [
  {
    pct: "50%",
    label: "Before reporting",
    desc: "Pay at least 50% of your course fee before your first class. This confirms your place and gives you access to the first block of course content.",
  },
  {
    pct: "25%",
    label: "Midway through the course",
    desc: "Pay the second instalment during the course to continue without interruption.",
  },
  {
    pct: "25%",
    label: "Before the final assessment",
    desc: "Clear the remaining balance before sitting your final examination.",
  },
];

export default async function FeesPage() {
  const [contact, courses] = await Promise.all([
    getContactInfo(),
    db.course.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true, title: true, slug: true,
        fullFeeUgx: true, feeContactOnly: true,
        internationalFeeUgx: true,
        durationMonths: true, category: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const USD_RATE = 3600; // UGX per USD

  return (
    <div>
      <PageHero
        image="/assets/images/hero-about.webp"
        imageAlt="Musawo Training Center skills lab"
        title="Fees and Instalments"
        description={process.env.DEMO_MODE === "true"
          ? "Indicative demo fees for the November 2026 intake. Confirm fees with admissions before payment."
          : "Contact admissions for current course fees and flexible instalment options for the November 2026 intake."}
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

            {/* ── Course fee table ─────────────────────────────── */}
            <AnimateIn className="mb-12">
              <p className="section-eyebrow">November 2026 intake</p>
              <h2 className="mt-2 mb-3 font-bold text-balance" style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}>
                Course fees
              </h2>
              <p className="text-gray-500 text-base leading-relaxed max-w-xl mb-6">
                All fees are in Uganda Shillings and include everything listed below. No hidden charges. We do not provide accommodation.
              </p>

              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-primary text-white">
                      <th className="text-left px-5 py-3 font-semibold">Course</th>
                      <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Duration</th>
                      <th className="text-right px-5 py-3 font-semibold whitespace-nowrap">Fee (UGX)</th>
                      <th className="text-right px-5 py-3 font-semibold whitespace-nowrap">Intl. fee (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {courses.map((c) => {
                      const duration = c.durationMonths
                        ? `${c.durationMonths} month${c.durationMonths > 1 ? "s" : ""}`
                        : "TBC";
                      const intlFeeUsd = c.internationalFeeUgx
                        ? Math.round(c.internationalFeeUgx / USD_RATE)
                        : c.fullFeeUgx
                        ? Math.round(c.fullFeeUgx / USD_RATE)
                        : null;
                      return (
                        <tr key={c.id} className="bg-white hover:bg-surface transition-colors">
                          <td className="px-5 py-4">
                            <Link
                              href={`/courses/${c.slug}`}
                              className="font-semibold text-primary no-underline hover:underline"
                            >
                              {c.title}
                            </Link>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {c.category === "PROFESSIONAL" ? "Professionals only" : "Open to all"}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{duration}</td>
                          <td className="px-5 py-4 text-right font-semibold text-primary whitespace-nowrap">
                            {c.feeContactOnly || !c.fullFeeUgx
                              ? <span className="text-gray-400 font-normal text-xs">Contact admissions</span>
                              : `UGX ${c.fullFeeUgx.toLocaleString()}`}
                          </td>
                          <td className="px-5 py-4 text-right text-gray-600 whitespace-nowrap">
                            {intlFeeUsd
                              ? `USD ${intlFeeUsd.toLocaleString()}`
                              : <span className="text-gray-400 text-xs">Contact admissions</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-400 mt-3">
                International fee is calculated at a rate of UGX 3,600 per USD. Contact admissions to confirm the current rate.
              </p>
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

            {/* ── Instalment plan ──────────────────────────────── */}
            <AnimateIn className="mb-10">
              <p className="section-eyebrow">Payment plan</p>
              <h2 className="mt-2 mb-3 font-bold text-balance" style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}>
                How to pay in instalments
              </h2>
              <p className="text-gray-500 text-base leading-relaxed max-w-xl mb-8">
                You can pay your course fee in three instalments. The same plan applies to all courses.
              </p>

              <div className="grid sm:grid-cols-3 gap-5">
                {INSTALMENT_PLAN.map(({ pct, label, desc }, i) => (
                  <div
                    key={pct}
                    className="bg-white rounded-2xl border border-border p-6 flex flex-col items-center text-center hover:shadow-card-hover transition-shadow"
                  >
                    <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-4">
                      <span className="text-accent font-extrabold text-xl">{pct}</span>
                    </div>
                    <p className="font-bold text-primary text-sm mb-1">Instalment {i + 1}</p>
                    <p className="text-sm font-semibold text-gray-700 mb-2">{label}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 bg-[#F1F7F5] rounded-2xl border border-border p-5 text-sm text-gray-600">
                <p className="font-semibold text-primary mb-1">How content access works</p>
                <p>
                  After paying 50%, you can access the first half of your course. After the second instalment (75% total), the rest of the content unlocks. Full access is maintained once you have paid in full.
                </p>
              </div>
            </AnimateIn>

            {/* ── Fee enquiries ─────────────────────────────────── */}
            <AnimateIn>
              <div className="bg-surface border border-border rounded-2xl p-5 text-sm text-gray-600">
                <p className="font-semibold text-primary mb-1">Fee enquiries</p>
                <p className="mb-3">
                  For fee confirmations and payment arrangements, contact admissions at{" "}
                  <a href="mailto:admissions@musawo.ug" className="text-primary no-underline hover:underline">
                    admissions@musawo.ug
                  </a>{" "}
                  or call{" "}
                  <a href="tel:+256709184468" className="text-primary no-underline hover:underline">
                    0709 184 468
                  </a>.
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

      <CTABand
        heading="Transparent fees, flexible payments."
        subheading="Apply for the November 2026 intake. Hybrid classes with hands-on practicals."
        primaryLabel="Apply now"
        primaryHref="/apply"
        whatsappUrl={contact.whatsappUrl}
      />
      <ContactBand whatsappUrl={contact.whatsappUrl} />
    </div>
  );
}
