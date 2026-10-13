import { db } from "@/lib/db";
import PageHero from "@/components/public/PageHero";
import { CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import AnimateIn from "@/components/public/AnimateIn";
import CoursesClient from "./CoursesClient";
import type { CourseItem } from "./CoursesClient";
import { getContactInfo } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Courses",
  description: "Browse accredited healthcare training courses from Musawo Training Center, Uganda.",
};

const FALLBACK: Record<string, string> = {
  "cna":                "/assets/images/course-cna.webp",
  "basic-nursing-care": "/assets/images/course-basic-nursing.webp",
  "child-care-safety":  "/assets/images/course-child-safety.webp",
};

const PLACEHOLDER_COURSES: CourseItem[] = [
  {
    id: "p1", title: "Certified Nursing Care Assistant (CNA)", slug: "cna",
    shortDescription: "Our flagship certification for nursing care assistants across Uganda.",
    thumbnailUrl: null, fullFeeUgx: 850000, durationWeeks: 12,
    instalmentCount: 3, tutorName: "MTC Faculty", lessonCount: 48,
    enrolmentCount: 0, img: "/assets/images/course-cna.webp", category: "Nursing",
  },
  {
    id: "p2", title: "Basic Nursing Care Assistant", slug: "basic-nursing-care",
    shortDescription: "An accessible entry point with a strong foundation in patient care.",
    thumbnailUrl: null, fullFeeUgx: 550000, durationWeeks: 8,
    instalmentCount: 2, tutorName: "MTC Faculty", lessonCount: 32,
    enrolmentCount: 0, img: "/assets/images/course-basic-nursing.webp", category: "Nursing",
  },
  {
    id: "p3", title: "Babysitting, Child Care & Safety Management", slug: "child-care-safety",
    shortDescription: "Child care, first aid, and emergency response for child safety workers.",
    thumbnailUrl: null, fullFeeUgx: 420000, durationWeeks: 6,
    instalmentCount: 1, tutorName: "MTC Faculty", lessonCount: 24,
    enrolmentCount: 0, img: "/assets/images/course-child-safety.webp", category: "Child Safety",
  },
];

const COMPARE = [
  { feature: "Duration",         cna: "12 weeks", basic: "8 weeks",  child: "6 weeks" },
  { feature: "Fee (UGX)",        cna: "850,000",  basic: "550,000",  child: "420,000" },
  { feature: "Instalments",      cna: "3",        basic: "2",        child: "1" },
  { feature: "MoH Accredited",   cna: "✓",        basic: "✓",        child: "✓" },
  { feature: "MoES Accredited",  cna: "✓",        basic: "✓",        child: "✓" },
  { feature: "Live classes",     cna: "2×/week",  basic: "2×/week",  child: "1×/week" },
  { feature: "Practical days",   cna: "4 days",   basic: "3 days",   child: "2 days" },
  { feature: "Certificate",      cna: "CNA",      basic: "BNCA",     child: "CCS" },
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

  const courses: CourseItem[] = dbCourses.length > 0
    ? dbCourses.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        shortDescription: c.shortDescription,
        thumbnailUrl: c.thumbnailUrl,
        fullFeeUgx: c.fullFeeUgx,
        durationWeeks: c.durationWeeks,
        instalmentCount: c.instalmentCount,
        tutorName: c.tutor.name,
        lessonCount: c.blocks.reduce((s, b) => s + b._count.lessons, 0),
        enrolmentCount: c._count.enrolments,
        img: c.thumbnailUrl ?? FALLBACK[c.slug] ?? "/assets/images/hero-courses.webp",
        category: c.slug === 'child-care-safety' ? 'Child Safety' : 'Nursing',
      }))
    : PLACEHOLDER_COURSES;

  return (
    <div className="bg-surface">
      <PageHero
        image="/assets/images/hero-courses.webp"
        imageAlt="Healthcare students in a Musawo Training Center classroom"
        title="Our Accredited Courses"
        description="Nationally recognised healthcare training designed for Ugandan health workers. Learn on any device, pay with mobile money."
        breadcrumbs={[{ label: "Courses" }]}
        cta={{ label: "Enrol now", href: "/register" }}
        boxSide="left"
        objectPosition="center right"
      />

      {/* Accreditation badge strip */}
      <div className="bg-white border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center gap-6 justify-center">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CheckCircle className="w-4 h-4 text-success flex-shrink-0" aria-hidden="true" />
            Ministry of Health Uganda — Accredited
          </div>
          <div className="hidden sm:block w-px h-5 bg-border" aria-hidden="true" />
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CheckCircle className="w-4 h-4 text-success flex-shrink-0" aria-hidden="true" />
            Ministry of Education &amp; Sports — Registered
          </div>
        </div>
      </div>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <CoursesClient courses={courses} />
      </section>

      {/* Comparison table */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16" aria-label="Course comparison">
        <AnimateIn>
          <h2 className="text-2xl font-bold text-primary mb-6">Compare courses</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th className="text-left">Feature</th>
                  <th>Certified Nursing Care Assistant</th>
                  <th>Basic Nursing Care</th>
                  <th>Child Care &amp; Safety</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((row) => (
                  <tr key={row.feature}>
                    <td className="font-medium text-primary">{row.feature}</td>
                    <td className="text-center">{row.cna}</td>
                    <td className="text-center">{row.basic}</td>
                    <td className="text-center">{row.child}</td>
                  </tr>
                ))}
                <tr>
                  <td className="font-medium text-primary">Enrol</td>
                  <td className="text-center">
                    <Link href="/register?course=cna" className="inline-flex items-center gap-1 text-xs text-accent font-bold no-underline hover:text-accent-600">
                      Enrol <ArrowRight className="w-3 h-3" aria-hidden="true" />
                    </Link>
                  </td>
                  <td className="text-center">
                    <Link href="/register?course=basic-nursing-care" className="inline-flex items-center gap-1 text-xs text-accent font-bold no-underline hover:text-accent-600">
                      Enrol <ArrowRight className="w-3 h-3" aria-hidden="true" />
                    </Link>
                  </td>
                  <td className="text-center">
                    <Link href="/register?course=child-care-safety" className="inline-flex items-center gap-1 text-xs text-accent font-bold no-underline hover:text-accent-600">
                      Enrol <ArrowRight className="w-3 h-3" aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </AnimateIn>
      </section>

      {/* CTA strip */}
      <div className="bg-primary py-16 px-4 sm:px-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
          Not sure which course to pick?
        </h2>
        <p className="text-white/70 mb-6 max-w-md mx-auto text-sm">
          Chat with our admissions team on WhatsApp and we&apos;ll help you choose.
        </p>
        <Link
          href={contact.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-600 text-white font-bold px-7 py-3 rounded-xl no-underline transition-colors shadow-cta"
        >
          Chat on WhatsApp <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
