import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle, Clock, BookOpen, Users, Video, FileText, PenSquare,
  Lock, ArrowRight, Banknote, Play, Download,
} from "lucide-react";
import { getContactInfo } from "@/lib/contact";
import PageHero from "@/components/public/PageHero";
import AnimateIn from "@/components/public/AnimateIn";
import StaggerGrid from "@/components/public/StaggerGrid";
import type { Metadata } from "next";

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await db.course.findUnique({
    where: { slug: params.slug, status: "PUBLISHED" },
    select: { title: true, shortDescription: true },
  });
  if (!c) return {};
  return {
    title: c.title,
    description: c.shortDescription
      ? `${c.shortDescription} Hybrid and online with 70% hands-on practicals. November 2026 intake.`
      : `${c.title} at Musawo Training Center. November 2026 intake.`,
  };
}

// Per-course hero images -- use different photos for each course
const HERO_IMAGES: Record<string, string> = {
  "medical-home-caregiver":         "/assets/images/cna-course.png",
  "basic-home-caregiver":           "/assets/images/basic-nursing.png",
  "babysitting-childcare-safety":   "/assets/images/first-aid-child-safety.jpg",
  "mental-health-support-advocacy": "/assets/community-outreach.webp",
  "care-older-persons-disability":  "/assets/clinical-training.webp",
  "basic-life-support-first-aid":   "/assets/training-session.webp",
  "advanced-life-support":          "/assets/healthcare-services.webp",
  "advanced-first-aid":             "/assets/training-session.webp",
};

function LessonIcon({ type }: { type: string }) {
  if (type === "VIDEO") return <Video className="w-3.5 h-3.5 text-primary/40 flex-shrink-0" aria-hidden="true" />;
  if (type === "NOTES") return <FileText className="w-3.5 h-3.5 text-primary/40 flex-shrink-0" aria-hidden="true" />;
  return <PenSquare className="w-3.5 h-3.5 text-primary/40 flex-shrink-0" aria-hidden="true" />;
}

const HIGHLIGHTS = [
  { icon: CheckCircle, title: "Digital certificate",    body: "QR-verifiable certificate on completion." },
  { icon: Play,        title: "Hybrid delivery",        body: "Online classes + 70% practicals in our skills lab." },
  { icon: Banknote,    title: "Pay in instalments",     body: "Split your fee into interest-free payments." },
  { icon: Video,       title: "Taught by professionals",body: "Doctors, nurses and clinicians." },
];

export default async function CourseDetailPage({ params }: Props) {
  const [course, contact] = await Promise.all([
    db.course.findUnique({
      where: { slug: params.slug, status: "PUBLISHED" },
      include: {
        tutor: { select: { name: true, avatarUrl: true } },
        blocks: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              select: { id: true, title: true, type: true, isFree: true, isFreePreview: true, durationSec: true },
            },
          },
        },
      },
    }),
    getContactInfo(),
  ]);
  if (!course) notFound();

  const totalLessons = course.blocks.reduce((s, b) => s + b.lessons.length, 0);
  const heroImg = HERO_IMAGES[course.slug] ?? "/assets/training-session.webp";
  const instalment = (course.instalmentCount ?? 1) > 1 && course.fullFeeUgx
    ? Math.ceil(course.fullFeeUgx / course.instalmentCount)
    : null;
  const duration = course.durationMonths
    ? `${course.durationMonths} month${course.durationMonths > 1 ? "s" : ""}`
    : course.durationWeeks
      ? `${course.durationWeeks} weeks`
      : null;
  const isProfessional = course.category === "PROFESSIONAL";

  // Lessons available for preview
  const previewLessons = course.blocks
    .flatMap((b) => b.lessons)
    .filter((l) => l.isFree || l.isFreePreview)
    .slice(0, 4);

  // Real seat count from open intakes
  const openIntake = await db.intake.findFirst({
    where: { courseId: course.id, isOpen: true },
    select: { seats: true, _count: { select: { enrolments: true } } },
  });
  const seatsRemaining = openIntake
    ? Math.max(0, openIntake.seats - openIntake._count.enrolments)
    : null;

  return (
    <div className="min-h-screen bg-surface">
      <PageHero
        image={heroImg}
        imageAlt={course.title}
        title={course.title}
        description={course.shortDescription ?? undefined}
        breadcrumbs={[{ label: "Courses", href: "/courses" }, { label: course.title }]}
        boxSide="left"
        objectPosition="center right"
      />

      {/* Feature highlights row */}
      <div className="bg-white border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
          <StaggerGrid className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-start gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-primary leading-tight">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug hidden sm:block">{body}</p>
                </div>
              </div>
            ))}
          </StaggerGrid>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid lg:grid-cols-3 gap-8 items-start">

          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">

            {/* Meta strip */}
            <AnimateIn>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500 bg-white rounded-2xl border border-border p-4">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" aria-hidden="true" />
                  {course.tutor.name}
                </span>
                {duration && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary" aria-hidden="true" />
                    {duration}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-primary" aria-hidden="true" />
                  {totalLessons} lessons in {course.blocks.length} blocks
                </span>
                <span className={`flex items-center gap-1.5 font-semibold ${isProfessional ? "text-primary" : "text-success"}`}>
                  <CheckCircle className="w-4 h-4" aria-hidden="true" />
                  {isProfessional ? "For registered health professionals" : "Open to all"}
                </span>
              </div>
            </AnimateIn>

            {/* Eligibility note for professional courses */}
            {isProfessional && course.eligibilityText && (
              <AnimateIn delay={0.04}>
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-sm text-primary">
                  <p className="font-semibold mb-1">Eligibility requirement</p>
                  <p className="text-gray-700">{course.eligibilityText}</p>
                </div>
              </AnimateIn>
            )}

            {/* Description */}
            <AnimateIn delay={0.05}>
              <h2 className="text-xl font-bold text-primary mb-3">About this course</h2>
              <div className="text-gray-600 leading-relaxed whitespace-pre-line">
                {course.description}
              </div>
              {course.contentNote && (
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Note: {course.contentNote}
                </p>
              )}
            </AnimateIn>

            {/* Delivery */}
            <AnimateIn delay={0.07}>
              <div className="bg-primary/5 border border-primary/15 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-primary mb-4">Delivery and teaching</h2>
                <ul className="space-y-3 list-none text-sm text-gray-700">
                  {[
                    "Hybrid and online classes with 70% hands-on practicals in our skills lab",
                    "Taught by doctors, nurses and clinicians",
                    `${course.intakeLabel ?? "November 2026"} intake`,
                    "Job placement support in Uganda",
                    "Job opportunities abroad through licensed recruitment agencies with pre-departure preparation",
                    "We do not provide accommodation",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimateIn>

            {/* Accreditation block - only shown when setting is non-empty */}
            {course.accreditationText && (
              <AnimateIn delay={0.08}>
                <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-primary mb-2">Accreditation</h2>
                  <p className="text-sm text-gray-700">{course.accreditationText}</p>
                </div>
              </AnimateIn>
            )}

            {/* Preview lessons */}
            {previewLessons.length > 0 && (
              <AnimateIn delay={0.1}>
                <h2 className="text-xl font-bold text-primary mb-4">Free preview lessons</h2>
                <div className="space-y-3">
                  {previewLessons.map((lesson) => (
                    <div key={lesson.id} className="flex items-center gap-4 bg-white rounded-2xl border border-border p-4 hover:border-accent/40 hover:shadow-card-hover transition-all duration-200">
                      <div className="w-10 h-10 bg-accent/15 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Play className="w-5 h-5 text-accent" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary truncate">{lesson.title}</p>
                        {lesson.durationSec && (
                          <p className="text-xs text-gray-400 mt-0.5">{Math.round(lesson.durationSec / 60)} min</p>
                        )}
                      </div>
                      <span className="text-xs text-success font-semibold bg-success/10 px-2 py-0.5 rounded-full flex-shrink-0">Free preview</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">Apply and enrol to unlock all {totalLessons} lessons.</p>
              </AnimateIn>
            )}

            {/* Curriculum */}
            <AnimateIn delay={0.12}>
              <h2 className="text-xl font-bold text-primary mb-2">Course curriculum</h2>
              <p className="text-sm text-gray-400 mb-4">
                {totalLessons} lessons in {course.blocks.length} modules{duration ? ` (${duration})` : ""}
              </p>
              <div className="space-y-2">
                {course.blocks.map((block, bi) => (
                  <details key={block.id} className="bg-white rounded-2xl border border-border overflow-hidden group" open={bi === 0}>
                    <summary className="flex justify-between items-center px-5 py-4 font-semibold text-primary cursor-pointer list-none hover:bg-surface transition-colors">
                      <span className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-accent/15 text-accent rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {block.order}
                        </span>
                        {block.title}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{block.lessons.length} lessons</span>
                    </summary>
                    {block.description && <p className="px-5 pb-3 text-sm text-gray-500">{block.description}</p>}
                    <ul className="border-t border-border divide-y divide-border/50 list-none">
                      {block.lessons.map((lesson) => (
                        <li key={lesson.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                          <LessonIcon type={lesson.type} />
                          <span className="flex-1 text-gray-700">{lesson.title}</span>
                          {lesson.isFree || lesson.isFreePreview ? (
                            <span className="text-xs text-success font-semibold bg-success/10 px-2 py-0.5 rounded-full">Free preview</span>
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-gray-300" aria-hidden="true" />
                          )}
                          {lesson.durationSec && (
                            <span className="text-xs text-gray-400">{Math.round(lesson.durationSec / 60)} min</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </AnimateIn>

            {/* Instructor */}
            <AnimateIn delay={0.14}>
              <div className="bg-white rounded-2xl border border-border p-6">
                <h2 className="text-xl font-bold text-primary mb-4">Your instructor</h2>
                <div className="flex items-center gap-4">
                  {course.tutor.avatarUrl ? (
                    <Image src={course.tutor.avatarUrl} alt={course.tutor.name} width={56} height={56} className="rounded-full" />
                  ) : (
                    <div className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0">
                      {course.tutor.name[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-primary">{course.tutor.name}</p>
                    <p className="text-sm text-gray-500">Musawo Training Center Faculty</p>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      Qualified healthcare professional and experienced trainer delivering hybrid and online instruction with skills lab practicals.
                    </p>
                  </div>
                </div>
              </div>
            </AnimateIn>

            {/* Course flyer download - static file */}
            <AnimateIn delay={0.16}>
              <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-primary mb-2">Call for applications</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Download and share the November 2026 intake flyer for this course.
                </p>
                <a
                  href="/assets/flyer-nov-2026.jpeg"
                  download="MTC-November-2026-Flyer.jpeg"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary-600 text-white font-bold px-5 py-2.5 rounded-xl no-underline transition-colors text-sm"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  Download flyer
                </a>
              </div>
            </AnimateIn>

          </div>

          {/* Sticky enrol card */}
          <aside>
            <div className="bg-white rounded-2xl border border-border shadow-card-hover p-6 sticky top-[80px]">
              {course.feeContactOnly || !course.fullFeeUgx ? (
                <div className="mb-4">
                  <p className="text-base font-semibold text-gray-600 mb-1">Course fee</p>
                  <p className="text-sm text-gray-500">
                    Fee: contact admissions at{" "}
                    <a href="mailto:admissions@musawo.ug" className="text-primary no-underline hover:underline">
                      admissions@musawo.ug
                    </a>
                  </p>
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-3xl font-extrabold text-accent mb-1">
                    UGX {course.fullFeeUgx.toLocaleString()}
                  </p>
                  {instalment && (
                    <p className="text-sm text-gray-400">
                      or {course.instalmentCount} instalments of{" "}
                      <strong>UGX {instalment.toLocaleString()}</strong>
                    </p>
                  )}
                </div>
              )}

              {seatsRemaining !== null && seatsRemaining <= 15 && (
                <p className="text-xs text-danger font-semibold mb-4 bg-danger/10 px-3 py-1.5 rounded-xl">
                  Only {seatsRemaining} seats remaining
                </p>
              )}

              <Link
                href={`/apply?course=${course.slug}`}
                className="btn-primary w-full no-underline text-center flex items-center justify-center gap-2 mb-3 py-3"
              >
                Apply now <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>

              <a
                href={contact.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold text-primary border border-border rounded-xl no-underline hover:border-accent/40 hover:text-accent transition-colors mb-5"
              >
                Ask on WhatsApp
              </a>

              <ul className="space-y-2.5 text-xs text-gray-500 list-none">
                {[
                  "Pay with MTN MoMo or Airtel Money",
                  "Digital certificate with QR verification",
                  "Access on any device",
                  duration ? `Complete in ${duration}` : null,
                  "Job placement support after graduation",
                ].filter(Boolean).map((item) => (
                  <li key={item!} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
