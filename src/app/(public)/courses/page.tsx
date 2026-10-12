import { db } from "@/lib/db";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, BookOpen, Users } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Courses — Musawo Training Center",
  description: "Browse accredited healthcare training courses from Musawo Training Center, Uganda.",
};

export default async function CoursesPage() {
  const courses = await db.course.findMany({
    where: { status: "PUBLISHED" },
    include: {
      tutor: { select: { name: true } },
      _count: { select: { enrolments: true } },
      blocks: { select: { _count: { select: { lessons: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const totalLessons = (blocks: { _count: { lessons: number } }[]) =>
    blocks.reduce((s, b) => s + b._count.lessons, 0);

  // Fallback images by slug
  const FALLBACK: Record<string, string> = {
    "cna":                "/assets/images/cna-course.png",
    "basic-nursing-care": "/assets/images/basic-nursing.png",
    "child-care-safety":  "/assets/images/first-aid-child-safety.jpg",
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero banner */}
      <div className="relative bg-primary text-white py-20 px-4 overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/assets/images/hero-training.jpg" alt="" fill className="object-cover opacity-20" aria-hidden="true" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/60" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <p className="section-eyebrow text-accent mb-2">Accredited by Uganda Government</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 text-balance">Our Courses</h1>
          <p className="text-white/75 max-w-xl mx-auto text-lg">
            Nationally accredited healthcare training designed for Ugandan health workers. Learn on any device, pay with mobile money.
          </p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        {courses.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-primary mb-2">Courses coming soon</h2>
            <p className="text-gray-500 mb-6">Our first intake is opening soon. Register to be notified.</p>
            <Link href="/register" className="btn-primary no-underline">Register your interest</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {courses.map((course) => {
              const img = course.thumbnailUrl ?? FALLBACK[course.slug] ?? "/assets/images/hero-training.jpg";
              const lessons = totalLessons(course.blocks);
              return (
                <article key={course.id} className="bg-white rounded-2xl overflow-hidden shadow-card border border-border hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200 flex flex-col group">
                  <div className="relative h-52 overflow-hidden">
                    <Image src={img} alt={`${course.title} course`} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
                    {course.durationWeeks && (
                      <span className="absolute top-3 right-3 bg-white/90 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
                        {course.durationWeeks} weeks
                      </span>
                    )}
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    <h2 className="font-extrabold text-base text-primary mb-2 leading-snug">{course.title}</h2>

                    {course.accreditationText && (
                      <p className="text-xs text-success font-semibold mb-2">✓ {course.accreditationText}</p>
                    )}

                    {course.shortDescription && (
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2 flex-1 leading-relaxed">{course.shortDescription}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-4">
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" aria-hidden="true" /> {course.tutor.name}</span>
                      {course.durationWeeks && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" aria-hidden="true" /> {course.durationWeeks} weeks</span>}
                      {lessons > 0 && <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" aria-hidden="true" /> {lessons} lessons</span>}
                    </div>

                    <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                      <div>
                        <p className="text-accent font-extrabold text-lg leading-none">UGX {course.fullFeeUgx.toLocaleString()}</p>
                        {course.instalmentCount > 1 && (
                          <p className="text-xs text-gray-400 mt-0.5">or {course.instalmentCount} instalments</p>
                        )}
                      </div>
                      <Link href={`/courses/${course.slug}`} className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-600 text-white text-xs font-bold px-4 py-2 rounded-xl no-underline transition-colors">
                        Enrol <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
