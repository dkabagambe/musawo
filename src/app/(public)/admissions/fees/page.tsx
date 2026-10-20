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

export default async function FeesPage() {
  const [contact, courses] = await Promise.all([
    getContactInfo(),
    db.course.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true, title: true, slug: true,
        fullFeeUgx: true, feeContactOnly: true,
        durationMonths: true, instalmentCount: true,
        category: true, targetAudience: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const INCLUDED_ALL = [
    "Full course access on all devices",
    "Hybrid and online classes with 70% hands-on practicals in our skills lab",
    "All assessments and examinations",
    "Digital certificate with QR verification",
    "Job placement support",
  ];

  return (
    <div>
      <PageHero
        image="/assets/images/hero-about.webp"
        imageAlt="Musawo Training Center skills lab"
        title="Fees and Instalments"
        description={process.env.DEMO_MODE === "true"
          ? "Indicative demo fees and flexible instalment options for the November 2026 intake. Confirm fees with admissions before payment."
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
            <AnimateIn className="mb-10">
              <p className="section-eyebrow">Transparent pricing</p>
              <h2 className="mt-2 mb-3 font-bold text-balance" style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}>
                Course fees - November 2026 intake
              </h2>
              <p className="text-gray-500 text-base leading-relaxed max-w-xl">
                All fees are in Uganda Shillings and include everything listed below. There are no hidden charges. We do not provide accommodation.
              </p>
            </AnimateIn>

            <div className="space-y-8">
              {courses.map((course, i) => {
                const duration = course.durationMonths
                  ? `${course.durationMonths} month${course.durationMonths > 1 ? "s" : ""}`
                  : null;
                const isProfessional = course.category === "PROFESSIONAL";
                const instalment = course.fullFeeUgx && course.instalmentCount > 1
                  ? Math.ceil(course.fullFeeUgx / course.instalmentCount)
                  : null;

                return (
                  <AnimateIn key={course.slug} delay={i * 0.06}>
                    <div className="bg-white rounded-2xl border border-border overflow-hidden">
                      {/* Course header */}
                      <div className="bg-primary px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <h3 className="font-bold text-white text-base">{course.title}</h3>
                          <p className="text-white/60 text-xs mt-0.5">
                            {duration ?? "Duration TBC"} |{" "}
                            {isProfessional ? "Professionals only" : "Open to all"}
                            {course.targetAudience ? ` | ${course.targetAudience}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          {course.feeContactOnly || !course.fullFeeUgx ? (
                            <p className="text-white/80 text-sm font-semibold">Fee: contact admissions</p>
                          ) : (
                            <>
                              <p className="text-accent font-extrabold text-xl leading-none">
                                UGX {course.fullFeeUgx.toLocaleString()}
                              </p>
                              <p className="text-white/60 text-xs mt-0.5">Full fee</p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="p-6 sm:p-8 grid sm:grid-cols-2 gap-8">
                        {/* Instalment plan */}
                        <div>
                          <h4 className="font-bold text-primary text-sm mb-4">
                            {!course.fullFeeUgx || course.feeContactOnly
                              ? "Payment"
                              : course.instalmentCount <= 1
                                ? "Single payment"
                                : `${course.instalmentCount}-instalment plan`}
                          </h4>
                          {course.feeContactOnly || !course.fullFeeUgx ? (
                            <p className="text-sm text-gray-600">
                              Contact admissions for fee details:{" "}
                              <a href="mailto:admissions@musawo.ug" className="text-primary no-underline hover:underline">
                                admissions@musawo.ug
                              </a>
                            </p>
                          ) : (
                            <ol className="space-y-3 list-none">
                              {Array.from({ length: course.instalmentCount }).map((_, idx) => {
                                const amount = idx === course.instalmentCount - 1
                                  ? course.fullFeeUgx! - (instalment ?? 0) * (course.instalmentCount - 1)
                                  : (instalment ?? course.fullFeeUgx!);
                                return (
                                  <li key={idx} className="flex items-start gap-3">
                                    <span className="text-xs font-extrabold text-accent/60 tracking-widest flex-shrink-0 mt-0.5 w-5">
                                      {String(idx + 1).padStart(2, "0")}
                                    </span>
                                    <div>
                                      <p className="font-semibold text-primary text-sm">
                                        UGX {amount.toLocaleString()}
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        {idx === 0
                                          ? "Due at enrolment."
                                          : idx === course.instalmentCount - 1
                                            ? "Due before the final examination."
                                            : "Due halfway through the course."}
                                      </p>
                                    </div>
                                  </li>
                                );
                              })}
                            </ol>
                          )}
                        </div>

                        {/* What is included */}
                        <div>
                          <h4 className="font-bold text-primary text-sm mb-4">What is included</h4>
                          <ul className="space-y-2 list-none">
                            {INCLUDED_ALL.map((item) => (
                              <li key={item} className="flex items-start gap-2.5 text-xs text-gray-600 leading-relaxed">
                                <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="px-6 pb-6 pt-0 flex gap-3 flex-wrap">
                        <Link
                          href={`/apply?course=${course.slug}`}
                          className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl no-underline transition-all shadow-cta"
                        >
                          Apply now <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
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
                );
              })}
            </div>

            <AnimateIn className="mt-8">
              <div className="bg-surface border border-border rounded-2xl p-5 text-sm text-gray-600">
                <p className="font-semibold text-primary mb-1">Fee enquiries</p>
                <p>
                  For fee confirmations and payment arrangements, contact admissions at{" "}
                  <a href="mailto:admissions@musawo.ug" className="text-primary no-underline hover:underline">
                    admissions@musawo.ug
                  </a>{" "}
                  or call{" "}
                  <a href="tel:+256709184468" className="text-primary no-underline hover:underline">
                    0709 184 468
                  </a>.
                </p>
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
