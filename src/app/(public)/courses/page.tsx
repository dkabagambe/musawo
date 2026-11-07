import { db } from "@/lib/db";
import PageHero from "@/components/public/PageHero";
import { CheckCircle, ArrowRight } from "lucide-react";

export const revalidate = 300; // courses list - cache 5 minutes
import Link from "next/link";
import type { Metadata } from "next";
import CoursesClient from "./CoursesClient";
import type { CourseItem } from "./CoursesClient";

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Browse healthcare training courses from Musawo Training Center, Uganda. Hybrid and online classes with 70% hands-on practicals in our skills lab. November 2026 intake.",
};

const FALLBACK: Record<string, string> = {
  "medical-home-caregiver": "/assets/images/cna-course.webp",
  "basic-home-caregiver": "/assets/images/basic-nursing.webp",
  "babysitting-childcare-safety": "/assets/images/first-aid-child-safety.jpg",
  "mental-health-support-advocacy": "/assets/community-outreach.webp",
  "care-older-persons-disability": "/assets/clinical-training.webp",
  "basic-life-support-first-aid": "/assets/training-session.webp",
  "advanced-life-support": "/assets/healthcare-services.webp",
  "advanced-first-aid": "/assets/training-session.webp",
};

// Static fallback courses used when the DB is unreachable at build/cold-start time
const STATIC_COURSE_ITEMS: CourseItem[] = [
  {
    id: "static-mhc", title: "Certificate in Medical Home Care Course",
    slug: "medical-home-caregiver", category: "PROFESSIONAL",
    shortDescription: "For registered health professionals. Equips nurses, midwives, clinical officers and other healthcare providers with the medical knowledge and practical skills to deliver competent, safe and compassionate home-based care.",
    thumbnailUrl: null, img: "/assets/images/cna-course.webp",
    fullFeeUgx: 2300000, internationalFeeUgx: null, feeContactOnly: false,
    durationMonths: 3, durationWeeks: null, instalmentCount: 3,
    tutorName: "Dr. Mathias Senyondo", lessonCount: 6, enrolmentCount: 0,
  },
  {
    id: "static-bhc", title: "Certificate in Basic Home Care",
    slug: "basic-home-caregiver", category: "OPEN",
    shortDescription: "For non-health professionals aged 18 and above. Equips participants with the basic knowledge and practical skills to provide safe, competent and compassionate home care.",
    thumbnailUrl: null, img: "/assets/images/basic-nursing.webp",
    fullFeeUgx: 1800000, internationalFeeUgx: null, feeContactOnly: false,
    durationMonths: 3, durationWeeks: null, instalmentCount: 3,
    tutorName: "Mirembe Joel", lessonCount: 6, enrolmentCount: 0,
  },
  {
    id: "static-bcs", title: "Basic Certificate in Babysitting, Child Care and Safety Management",
    slug: "babysitting-childcare-safety", category: "OPEN",
    shortDescription: "Equips participants with the basic knowledge and practical skills to provide childcare in homes, childcare settings or as professional babysitters.",
    thumbnailUrl: null, img: "/assets/images/first-aid-child-safety.jpg",
    fullFeeUgx: 1200000, internationalFeeUgx: null, feeContactOnly: false,
    durationMonths: 2, durationWeeks: null, instalmentCount: 2,
    tutorName: "Mirembe Joel", lessonCount: 6, enrolmentCount: 0,
  },
  {
    id: "static-mha", title: "Certificate in Mental Health Support and Advocacy",
    slug: "mental-health-support-advocacy", category: "OPEN",
    shortDescription: "Equips learners with the knowledge, practical skills and professional attitudes to promote mental health and advocate for people living with mental health conditions in Uganda.",
    thumbnailUrl: null, img: "/assets/community-outreach.webp",
    fullFeeUgx: 1800000, internationalFeeUgx: null, feeContactOnly: false,
    durationMonths: 3, durationWeeks: null, instalmentCount: 3,
    tutorName: "Dr. Mathias Senyondo", lessonCount: 6, enrolmentCount: 0,
  },
  {
    id: "static-cop", title: "Basic Certificate in Care of Older Persons and Persons with Disability",
    slug: "care-older-persons-disability", category: "OPEN",
    shortDescription: "Equips participants with the basic knowledge and practical skills to provide safe, dignified and skilled care to older persons and adults with disabilities.",
    thumbnailUrl: null, img: "/assets/clinical-training.webp",
    fullFeeUgx: 1800000, internationalFeeUgx: null, feeContactOnly: false,
    durationMonths: 3, durationWeeks: null, instalmentCount: 3,
    tutorName: "Mirembe Joel", lessonCount: 6, enrolmentCount: 0,
  },
  {
    id: "static-bls", title: "Certificate in Basic Life Support",
    slug: "basic-life-support-first-aid", category: "PROFESSIONAL",
    shortDescription: "For health professionals. Develops the knowledge, practical skills and professional behaviours required to recognise cardiac arrest and other immediate life-threatening emergencies.",
    thumbnailUrl: null, img: "/assets/training-session.webp",
    fullFeeUgx: 600000, internationalFeeUgx: null, feeContactOnly: false,
    durationMonths: 1, durationWeeks: null, instalmentCount: 1,
    tutorName: "Dr. Mathias Senyondo", lessonCount: 5, enrolmentCount: 0,
  },
  {
    id: "static-als", title: "Certificate in Advanced Life Support",
    slug: "advanced-life-support", category: "PROFESSIONAL",
    shortDescription: "Strengthens the ability of eligible healthcare professionals to recognise and manage adult cardiac arrest and other time-critical cardiopulmonary emergencies.",
    thumbnailUrl: null, img: "/assets/healthcare-services.webp",
    fullFeeUgx: 900000, internationalFeeUgx: null, feeContactOnly: false,
    durationMonths: 1, durationWeeks: null, instalmentCount: 1,
    tutorName: "Dr. Mathias Senyondo", lessonCount: 6, enrolmentCount: 0,
  },
  {
    id: "static-afa", title: "Certificate in Advanced First Aid",
    slug: "advanced-first-aid", category: "OPEN",
    shortDescription: "Equips non-health professionals with essential first aid knowledge and practical skills to recognize emergencies and respond appropriately before professional medical help arrives.",
    thumbnailUrl: null, img: "/assets/training-session.webp",
    fullFeeUgx: null, internationalFeeUgx: null, feeContactOnly: true,
    durationMonths: 1, durationWeeks: null, instalmentCount: 1,
    tutorName: "Mirembe Joel", lessonCount: 4, enrolmentCount: 0,
  },
];

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
    feature: "Fee",
    values: [
      "USD 639 (≈ UGX 2,300,000)",
      "UGX 1,800,000",
      "UGX 1,200,000",
      "UGX 1,800,000",
      "UGX 1,800,000",
      "UGX 600,000",
      "UGX 900,000",
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
  let courses: CourseItem[] = STATIC_COURSE_ITEMS;

  try {
    const dbCourses = await db.course.findMany({
      where: { status: "PUBLISHED" },
      include: {
        tutor: { select: { name: true } },
        _count: { select: { enrolments: true } },
        blocks: { select: { _count: { select: { lessons: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    if (dbCourses.length > 0) {
      courses = dbCourses.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        shortDescription: c.shortDescription,
        thumbnailUrl: c.thumbnailUrl,
        fullFeeUgx: c.fullFeeUgx,
        internationalFeeUgx: c.internationalFeeUgx,
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
    }
  } catch {
    // DB unavailable - use static fallback
  }

  return (
    <div className="bg-surface">
      <PageHero
        image="/assets/images/hero-courses.webp"
        imageAlt="Healthcare students in a Musawo Training Center skills lab session"
        title="Our Courses"
        description="Hybrid and online classes with 70% hands-on practicals in our skills lab. Taught by licensed doctors, nurses, midwives and other healthcare professionals. Eight programmes across nursing, childcare, mental health and life support."
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
            Pay with MTN MoMo or Airtel Money
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
                          row.feature === "Fee"
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

    </div>
  );
}
