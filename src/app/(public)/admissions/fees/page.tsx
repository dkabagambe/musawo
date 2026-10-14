import PageHero from "@/components/public/PageHero";
import CTABand from "@/components/public/CTABand";
import ContactBand from "@/components/public/ContactBand";
import SideNav from "@/components/public/SideNav";
import AnimateIn from "@/components/public/AnimateIn";
import { getContactInfo } from "@/lib/contact";
import { CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fees and Instalments",
  description: "Full course fees and flexible instalment options at Musawo Training Center Uganda.",
};

const ADMISSIONS_NAV = [
  { label: "How to enrol",         href: "/admissions/how-to-enrol" },
  { label: "Fees and instalments", href: "/admissions/fees" },
  { label: "Scholarships",         href: "/scholarships" },
  { label: "Payment options",      href: "/admissions/payment-options" },
];

const COURSES = [
  {
    title: "Certified Nursing Care Assistant (CNA)",
    slug: "cna",
    weeks: 12,
    fullFee: "UGX 850,000",
    instalment1: "UGX 300,000",
    instalment2: "UGX 250,000",
    instalment3: "UGX 300,000",
    instalments: 3,
    note: "Tuition only. No accommodation fee - students are day scholars. Comparable programmes at accredited university hospitals charge UGX 2,500,000+ per semester; our short-course model keeps costs low.",
    included: [
      "Full course access on all devices",
      "2 live classes per week (48 sessions)",
      "4 practical days at Lungujja clinic",
      "All assessments and final examination",
      "Digital CNA certificate with QR verification",
      "Job placement support",
    ],
  },
  {
    title: "Basic Nursing Care Assistant (BNCA)",
    slug: "basic-nursing-care",
    weeks: 8,
    fullFee: "UGX 600,000",
    instalment1: "UGX 300,000",
    instalment2: "UGX 300,000",
    instalments: 2,
    note: "Tuition only. No accommodation fee. Pay the first instalment to secure your place; the balance is due at the halfway point.",
    included: [
      "Full course access on all devices",
      "2 live classes per week (32 sessions)",
      "3 practical days at Lungujja clinic",
      "All assessments and final examination",
      "Digital BNCA certificate with QR verification",
    ],
  },
  {
    title: "Child Care and Safety Management (CCS)",
    slug: "child-care-safety",
    weeks: 6,
    fullFee: "UGX 480,000",
    instalment1: "UGX 480,000",
    instalments: 1,
    note: "Single tuition payment. No accommodation fee. Our shortest programme - six weeks, one payment, no hidden costs.",
    included: [
      "Full course access on all devices",
      "1 live class per week (12 sessions)",
      "2 practical days at Lungujja clinic",
      "All assessments and final examination",
      "Digital CCS certificate with QR verification",
    ],
  },
];

export default async function FeesPage() {
  const contact = await getContactInfo();

  return (
    <div>
      <PageHero
        image="/assets/images/hero-about.webp"
        imageAlt="Musawo Training Center campus and facilities"
        title="Fees and Instalments"
        description="Affordable fees with flexible instalment options so cost is never a barrier to becoming a health worker."
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
            <AnimateIn className="mb-10">
              <p className="section-eyebrow">Transparent pricing</p>
              <h2
                className="mt-2 mb-3 font-bold text-balance"
                style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}
              >
                Course fees 2026/2027
              </h2>
              <p className="text-gray-500 text-base leading-relaxed max-w-xl">
                All fees are in Uganda Shillings and include everything listed below. There are no hidden charges.
              </p>
            </AnimateIn>

            <div className="space-y-8">
              {COURSES.map((course, i) => (
                <AnimateIn key={course.slug} delay={i * 0.08}>
                  <div className="bg-white rounded-2xl border border-border overflow-hidden">
                    {/* Course header */}
                    <div className="bg-primary px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <h3 className="font-bold text-white text-base">{course.title}</h3>
                        <p className="text-white/60 text-xs mt-0.5">{course.weeks} weeks</p>
                      </div>
                      <div className="text-right">
                        <p className="text-accent font-extrabold text-xl leading-none">{course.fullFee}</p>
                        <p className="text-white/60 text-xs mt-0.5">Full fee</p>
                      </div>
                    </div>

                    <div className="p-6 sm:p-8 grid sm:grid-cols-2 gap-8">
                      {/* Instalment plan */}
                      <div>
                        <h4 className="font-bold text-primary text-sm mb-4">
                          {course.instalments === 1 ? "Single payment" : `${course.instalments}-instalment plan`}
                        </h4>
                        <ol className="space-y-3 list-none">
                          <li className="flex items-start gap-3">
                            <span className="text-xs font-extrabold text-accent/60 tracking-widest flex-shrink-0 mt-0.5 w-5">01</span>
                            <div>
                              <p className="font-semibold text-primary text-sm">{course.instalment1}</p>
                              <p className="text-xs text-gray-400">Due at enrolment. Unlocks all course content.</p>
                            </div>
                          </li>
                          {course.instalment2 && (
                            <li className="flex items-start gap-3">
                              <span className="text-xs font-extrabold text-accent/60 tracking-widest flex-shrink-0 mt-0.5 w-5">02</span>
                              <div>
                                <p className="font-semibold text-primary text-sm">{course.instalment2}</p>
                                <p className="text-xs text-gray-400">Due halfway through the course.</p>
                              </div>
                            </li>
                          )}
                          {course.instalment3 && (
                            <li className="flex items-start gap-3">
                              <span className="text-xs font-extrabold text-accent/60 tracking-widest flex-shrink-0 mt-0.5 w-5">03</span>
                              <div>
                                <p className="font-semibold text-primary text-sm">{course.instalment3}</p>
                                <p className="text-xs text-gray-400">Due before the final examination.</p>
                              </div>
                            </li>
                          )}
                        </ol>
                      </div>

                      {/* What is included */}
                      <div>
                        <h4 className="font-bold text-primary text-sm mb-4">What is included</h4>
                        <ul className="space-y-2 list-none">
                          {course.included.map((item) => (
                            <li key={item} className="flex items-start gap-2.5 text-xs text-gray-600 leading-relaxed">
                              <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="px-6 pb-6 pt-2 flex gap-3 flex-wrap">
                      {course.note && (
                        <p className="w-full text-xs text-gray-400 italic leading-relaxed mb-2">
                          {course.note}
                        </p>
                      )}
                      <Link
                        href={`/register?course=${course.slug}`}
                        className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl no-underline transition-all shadow-cta"
                      >
                        Enrol now <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                      <Link
                        href={`/courses/${course.slug}`}
                        className="inline-flex items-center gap-1.5 bg-primary/10 hover:bg-primary/15 text-primary font-semibold text-sm px-5 py-2.5 rounded-xl no-underline transition-colors"
                      >
                        View course
                      </Link>
                    </div>
                  </div>
                </AnimateIn>
              ))}
            </div>

            {/* Scholarship notice */}
            <AnimateIn className="mt-10">
              <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6 flex gap-4 items-start">
                <span className="text-2xl flex-shrink-0" role="img" aria-label="Scholarship">🎓</span>
                <div>
                  <h3 className="font-bold text-primary mb-1">Scholarships available</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">
                    We reserve full and 50% subsidised scholarship places every intake for candidates who demonstrate financial need. You can apply for a scholarship when you register.
                  </p>
                  <Link
                    href="/scholarships"
                    className="inline-flex items-center gap-1.5 text-accent font-semibold text-sm hover:text-accent-600 no-underline transition-colors"
                  >
                    Learn about scholarships <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </AnimateIn>

          </div>
        </div>
      </div>

      <CTABand
        heading="Transparent fees, flexible payments."
        subheading="Start with the first instalment. Complete the rest as you learn."
        whatsappUrl={contact.whatsappUrl}
      />
      <ContactBand whatsappUrl={contact.whatsappUrl} />
    </div>
  );
}
