import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle, Clock, BookOpen, Users, Video, FileText, PenSquare,
  Lock, ArrowRight, Award, Smartphone, Banknote, Play,
} from "lucide-react";
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
  return { title: c.title, description: c.shortDescription ?? undefined };
}

const HERO_IMAGES: Record<string, string> = {
  "cna":                "/assets/images/course-cna.webp",
  "basic-nursing-care": "/assets/images/course-basic-nursing.webp",
  "child-care-safety":  "/assets/images/course-child-safety.webp",
};

const FALLBACK: Record<string, string> = {
  "cna":                "/assets/images/cna-course.png",
  "basic-nursing-care": "/assets/images/basic-nursing.png",
  "child-care-safety":  "/assets/images/first-aid-child-safety.jpg",
};

function LessonIcon({ type }: { type: string }) {
  if (type === "VIDEO") return <Video className="w-3.5 h-3.5 text-primary/40 flex-shrink-0" aria-hidden="true" />;
  if (type === "NOTES") return <FileText className="w-3.5 h-3.5 text-primary/40 flex-shrink-0" aria-hidden="true" />;
  return <PenSquare className="w-3.5 h-3.5 text-primary/40 flex-shrink-0" aria-hidden="true" />;
}

const WHAT_YOU_LEARN = [
  "Core nursing care theory and practice",
  "Patient assessment and care planning",
  "Infection prevention and control",
  "Safe medication administration",
  "Communication with patients and families",
  "Practical skills validated at our Lungujja centre",
];

const HIGHLIGHTS = [
  { icon: Award,       title: "MoH Accredited",      body: "Nationally recognised certificate upon completion." },
  { icon: Smartphone,  title: "Mobile learning",     body: "Study on any device, even on slow connections." },
  { icon: Banknote,    title: "Pay in instalments",  body: "Split your fee into up to 3 interest-free payments." },
  { icon: CheckCircle, title: "QR Certificate",      body: "Verify your achievement with a scannable QR code." },
];

export default async function CourseDetailPage({ params }: Props) {
  const course = await db.course.findUnique({
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
  });
  if (!course) notFound();

  const totalLessons = course.blocks.reduce((s, b) => s + b.lessons.length, 0);
  const heroImg = HERO_IMAGES[course.slug] ?? FALLBACK[course.slug] ?? "/assets/images/hero-courses.webp";
  const instalment = course.instalmentCount > 1 ? Math.ceil(course.fullFeeUgx / course.instalmentCount) : null;

  // Lessons available for preview (free or freePreview)
  const previewLessons = course.blocks
    .flatMap((b) => b.lessons)
    .filter((l) => l.isFree || l.isFreePreview)
    .slice(0, 4);

  // Seats remaining: placeholder — replace with real DB count when intake model is added
  const seatsRemaining = 12;

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <StaggerGrid className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary leading-tight">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{body}</p>
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
            {/* Meta */}
            <AnimateIn>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500 bg-white rounded-2xl border border-border p-4">
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" aria-hidden="true" /> {course.tutor.name}</span>
                {course.durationWeeks && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" aria-hidden="true" /> {course.durationWeeks} weeks</span>}
                <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-primary" aria-hidden="true" /> {totalLessons} lessons in {course.blocks.length} blocks</span>
                {course.accreditationText && (
                  <span className="flex items-center gap-1.5 text-success font-semibold">
                    <CheckCircle className="w-4 h-4" aria-hidden="true" /> {course.accreditationText}
                  </span>
                )}
              </div>
            </AnimateIn>

            {/* Description */}
            <AnimateIn delay={0.05}>
              <h2 className="text-xl font-bold text-primary mb-3">About this course</h2>
              <p className="text-gray-600 leading-relaxed">{course.description}</p>
            </AnimateIn>

            {/* What you'll learn */}
            <AnimateIn delay={0.1}>
              <div className="bg-primary/5 border border-primary/15 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-primary mb-4">What you will learn</h2>
                <ul className="grid sm:grid-cols-2 gap-3 list-none">
                  {WHAT_YOU_LEARN.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimateIn>

            {/* Preview lessons */}
            {previewLessons.length > 0 && (
              <AnimateIn delay={0.12}>
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
                <p className="text-xs text-gray-400 mt-3">Enrol to unlock all {totalLessons} lessons.</p>
              </AnimateIn>
            )}

            {/* Curriculum */}
            <AnimateIn delay={0.14}>
              <h2 className="text-xl font-bold text-primary mb-2">Course curriculum</h2>
              <p className="text-sm text-gray-400 mb-4">
                {totalLessons} lessons · {course.blocks.length} blocks{course.durationWeeks ? ` · ${course.durationWeeks} weeks` : ""}
              </p>
              <div className="space-y-2">
                {course.blocks.map((block, bi) => (
                  <details key={block.id} className="bg-white rounded-2xl border border-border overflow-hidden group" open={bi === 0}>
                    <summary className="flex justify-between items-center px-5 py-4 font-semibold text-primary cursor-pointer list-none hover:bg-surface transition-colors">
                      <span className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-accent/15 text-accent rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">{block.order}</span>
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
                          {lesson.durationSec && <span className="text-xs text-gray-400">{Math.round(lesson.durationSec / 60)} min</span>}
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </AnimateIn>

            {/* Instructor */}
            <AnimateIn delay={0.16}>
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
                      Qualified healthcare professional and experienced trainer delivering practical and online instruction in nursing care.
                    </p>
                  </div>
                </div>
              </div>
            </AnimateIn>
          </div>

          {/* Sticky enrol card */}
          <aside>
            <div className="bg-white rounded-2xl border border-border shadow-card-hover p-6 sticky top-20">
              <p className="text-3xl font-extrabold text-accent mb-1">UGX {course.fullFeeUgx.toLocaleString()}</p>
              {instalment && (
                <p className="text-sm text-gray-400 mb-2">
                  or {course.instalmentCount} instalments of <strong>UGX {instalment.toLocaleString()}</strong>
                </p>
              )}
              {seatsRemaining <= 15 && (
                <p className="text-xs text-danger font-semibold mb-4 bg-danger/10 px-3 py-1.5 rounded-xl">
                  Only {seatsRemaining} seats remaining
                </p>
              )}
              <Link
                href={`/register?course=${course.slug}`}
                className="btn-primary w-full no-underline text-center flex items-center justify-center gap-2 mb-3 py-3"
              >
                Enrol now <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <a
                href="https://wa.me/256785423523"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold text-primary border border-border rounded-xl no-underline hover:border-accent/40 hover:text-accent transition-colors mb-5"
              >
                💬 Ask on WhatsApp
              </a>
              <Link href="/register?scholarship=1" className="btn-outline w-full no-underline text-center text-sm mb-5">
                Apply for scholarship
              </Link>
              <ul className="space-y-2.5 text-xs text-gray-500 list-none">
                {[
                  "Pay with MTN MoMo or Airtel Money",
                  "Nationally recognised certificate",
                  "Access on any device",
                  course.durationWeeks ? `Complete in ${course.durationWeeks} weeks` : null,
                  "Employment support after graduation",
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
