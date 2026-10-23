import { db } from "@/lib/db";
import PageHero from "@/components/public/PageHero";
import CTABand from "@/components/public/CTABand";
import ContactBand from "@/components/public/ContactBand";
import { CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import CoursesClient from "./CoursesClient";
import type { CourseItem } from "./CoursesClient";
import { getContactInfo } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Browse healthcare training courses from Musawo Training Center, Uganda. Hybrid and online classes with 70% hands-on practicals in our skills lab. November 2026 intake.",
};

const FALLBACK: Record<string, string> = {
  "medical-home-caregiver": "/assets/images/cna-course.png",
  "basic-home-caregiver": "/assets/images/basic-nursing.png",
  "babysitting-childcare-safety": "/assets/images/first-aid-child-safety.jpg",
  "mental-health-support-advocacy": "/assets/community-outreach.webp",
  "care-older-persons-disability": "/assets/clinical-training.webp",
  "basic-life-support-first-aid": "/assets/training-session.webp",
  "advanced-life-support": "/assets/healthcare-services.webp",
  "advanced-first-aid": "/assets/training-session.webp",
};

const COMPARE_ROWS = [
  {
    feature: "Duration",
    values: [
      "3 months",
      "3 months",
      "2 months",
      "3 months",
      "3 months",
      "1 month",
      "1 month",
      "1 month",
    ],
  },
  {
    feature: "Category",
    values: [
      "Professional",
      "Open to all",
      "Open to all",
      "Open to all",
      "Open to all",
      "Professional",
      "Professional",
      "Open to all",
    ],
  },
  {
    feature: "Fee (UGX)",
    values: [
      "2,300,000",
      "1,800,000",
      "1,200,000",
      "1,800,000",
      "1,800,000",
      "600,000",
      "900,000",
      "Contact admissions",
    ],
  },
  { feature: "Instalments", values: ["3", "3", "2", "3", "3", "1", "1", "1"] },
  {
    feature: "Certificate",
    values: ["Yes", "Yes", "Yes", "Yes", "Yes", "Yes", "Yes", "Yes"],
  },
  {
    feature: "Skills lab practicals",
    values: ["70%", "70%", "70%", "70%", "70%", "70%", "70%", "70%"],
  },
];

const COMPARE_COURSES = [
  "Medical Home Caregiver",
  "Basic Home Care",
  "Babysitting and Childcare",
  "Mental Health Support",
  "Care of Older Persons",
  "Basic Life Support",
  "Advanced Life Support",
  "Advanced First Aid",
];

const COMPARE_SLUGS = [
  "medical-home-caregiver",
  "basic-home-caregiver",
  "babysitting-childcare-safety",
  "mental-health-support-advocacy",
  "care-older-persons-disability",
  "basic-life-support-first-aid",
  "advanced-life-support",
  "advanced-first-aid",
];

// Per-instalment amount (fee / instalments), or "-" for single payment / contact admissions
const COMPARE_INSTALMENTS = [
  "767,000 x 3",   // 2,300,000 / 3
  "600,000 x 3",   // 1,800,000 / 3
  "600,000 x 2",   // 1,200,000 / 2
  "600,000 x 3",   // 1,800,000 / 3
  "600,000 x 3",   // 1,800,000 / 3
  "600,000",       // 1 payment
  "900,000",       // 1 payment
  "-",             // contact admissions
];

export default async function CoursesPage() {
  const [dbCourses, contact] = await Promise.all([
    db.course.findMany({
      where: { status: "PUBLISHED" },
      include: {
        tutor: { select: { name: true } },
        _count: { select: { enrolments: true } },
        blocks: { select: { _count: { select: { lessons: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    getContactInfo(),
  ]);

  const courses: CourseItem[] = dbCourses.map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    shortDescription: c.shortDescription,
    thumbnailUrl: c.thumbnailUrl,
    fullFeeUgx: c.fullFeeUgx,
    feeContactOnly: c.feeContactOnly,
    durationMonths: c.durationMonths,
    durationWeeks: c.durationWeeks,
    instalmentCount: c.instalmentCount,
    tutorName: c.tutor.name,
    lessonCount: c.blocks.reduce((s, b) => s + b._count.lessons, 0),
    enrolmentCount: c._count.enrolments,
    img: c.thumbnailUrl ?? FALLBACK[c.slug] ?? "/assets/training-session.webp",
    category: c.category,
  }));

  return (
    <div className="bg-surface">
      <PageHero
        image="/assets/images/hero-courses.webp"
        imageAlt="Healthcare students in a Musawo Training Center skills lab session"
        title="Our Courses"
        description="Hybrid and online classes with 70% hands-on practicals in our skills lab. Taught by doctors, nurses and clinicians. Eight programmes across nursing, childcare, mental health and life support."
        breadcrumbs={[{ label: "Courses" }]}
        cta={{ label: "Apply now", href: "/apply" }}
        boxSide="left"
        objectPosition="center right"
      />

      {/* Key facts strip */}
      <div className="bg-white border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center gap-6 justify-center">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CheckCircle
              className="w-4 h-4 text-success flex-shrink-0"
              aria-hidden="true"
            />
            Hybrid and online classes
          </div>
          <div
            className="hidden sm:block w-px h-5 bg-border"
            aria-hidden="true"
          />
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CheckCircle
              className="w-4 h-4 text-success flex-shrink-0"
              aria-hidden="true"
            />
            70% hands-on practicals in our skills lab
          </div>
          <div
            className="hidden sm:block w-px h-5 bg-border"
            aria-hidden="true"
          />
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CheckCircle
              className="w-4 h-4 text-success flex-shrink-0"
              aria-hidden="true"
            />
            Pay with MTN, Airtel or bank
          </div>
          <div
            className="hidden sm:block w-px h-5 bg-border"
            aria-hidden="true"
          />
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CheckCircle
              className="w-4 h-4 text-success flex-shrink-0"
              aria-hidden="true"
            />
            Digital certificate with QR verification
          </div>
        </div>
      </div>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <CoursesClient courses={courses} />
      </section>

      {/* Comparison table */}
      <section
        className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 overflow-x-auto"
        aria-label="Course comparison"
      >
          <h2 className="text-2xl font-bold text-primary mb-2">
            Compare courses at a glance
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Fees shown are demo/indicative amounts. Contact admissions for confirmed pricing.
          </p>
          <div className="table-container min-w-[720px]">
            <table className="table text-xs">
              <thead>
                <tr>
                  <th className="text-left w-36">Feature</th>
                  {COMPARE_COURSES.map((name) => (
                    <th key={name} className="text-center text-xs leading-snug">
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.feature}>
                    <td className="font-medium text-primary">{row.feature}</td>
                    {row.values.map((v, i) => (
                      <td
                        key={i}
                        className={`text-center ${
                          row.feature === "Fee (UGX)"
                            ? v === "Contact admissions"
                              ? "text-gray-400 italic"
                              : "font-semibold text-accent"
                            : ""
                        }`}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="font-medium text-primary">Instalment amount</td>
                  {COMPARE_INSTALMENTS.map((v, i) => (
                    <td key={i} className="text-center text-gray-500">
                      {v}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="font-medium text-primary">Apply</td>
                  {COMPARE_SLUGS.map((slug) => (
                    <td key={slug} className="text-center">
                      <Link
                        href={`/apply?course=${slug}`}
                        className="inline-flex items-center gap-1 text-xs text-accent font-bold no-underline hover:text-accent-600"
                      >
                        Apply{" "}
                        <ArrowRight className="w-3 h-3" aria-hidden="true" />
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
      </section>

      <CTABand
        heading="Not sure which course to pick?"
        subheading="Chat with our admissions team on WhatsApp and we will help you choose the right programme."
        primaryLabel="Apply now"
        primaryHref="/apply"
        whatsappUrl={contact.whatsappUrl}
      />
      <ContactBand whatsappUrl={contact.whatsappUrl} />
    </div>
  );
}
