import { db } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Courses — Musawo Training Center",
  description: "Browse accredited healthcare training courses from Musawo Training Center, Uganda.",
};

export default async function CoursesPage() {
  const courses = await db.course.findMany({
    where: { status: "PUBLISHED" },
    include: {
      tutor: { select: { name: true } },
      _count: { select: { blocks: true, enrolments: true } },
      blocks: { select: { _count: { select: { lessons: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const totalLessons = (blocks: { _count: { lessons: number } }[]) =>
    blocks.reduce((s, b) => s + b._count.lessons, 0);

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-primary text-white py-14 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Our Courses</h1>
          <p className="text-white/70 max-w-xl mx-auto">
            Nationally accredited healthcare training designed for Ugandan health workers.
            Learn on any device, pay with mobile money.
          </p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {courses.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4" aria-hidden="true">📚</p>
            <p className="text-gray-500">No courses available yet. Check back soon.</p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <article key={course.id} className="card flex flex-col hover:shadow-md transition-shadow">
              {/* Thumbnail */}
              <div className="h-40 rounded-xl bg-primary/10 mb-4 overflow-hidden flex items-center justify-center">
                {course.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={course.thumbnailUrl}
                    alt={`${course.title} thumbnail`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl" aria-hidden="true">🏥</span>
                )}
              </div>

              <div className="flex-1 flex flex-col">
                <h2 className="font-bold text-base mb-1 leading-snug">{course.title}</h2>

                {course.accreditationText && (
                  <p className="text-xs text-success mb-2">✓ {course.accreditationText}</p>
                )}

                {course.shortDescription && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2 flex-1">
                    {course.shortDescription}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                  <span>👤 {course.tutor.name}</span>
                  {course.durationWeeks && <span>⏱ {course.durationWeeks} weeks</span>}
                  <span>📖 {totalLessons(course.blocks)} lessons</span>
                </div>

                <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                  <div>
                    <p className="text-lg font-bold text-accent">
                      UGX {course.fullFeeUgx.toLocaleString()}
                    </p>
                    {course.instalmentCount > 1 && (
                      <p className="text-xs text-gray-400">
                        or {course.instalmentCount} instalments
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/courses/${course.slug}`}
                    className="btn-primary text-sm no-underline"
                  >
                    View course
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
