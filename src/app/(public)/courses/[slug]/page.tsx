import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = await db.course.findUnique({
    where: { slug: params.slug, status: "PUBLISHED" },
    select: { title: true, shortDescription: true },
  });
  if (!course) return {};
  return {
    title: course.title,
    description: course.shortDescription ?? undefined,
  };
}

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
            select: { id: true, title: true, type: true, isFree: true, durationSec: true },
          },
        },
      },
    },
  });

  if (!course) notFound();

  const totalLessons = course.blocks.reduce(
    (sum, b) => sum + b.lessons.length,
    0
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-sm mb-6">
        <ol className="flex items-center gap-2 list-none text-gray-400">
          <li>
            <Link href="/" className="hover:text-primary no-underline">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/courses" className="hover:text-primary no-underline">
              Courses
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-primary font-medium">{course.title}</li>
        </ol>
      </nav>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          {course.thumbnailUrl && (
            <div className="relative h-56 rounded-2xl overflow-hidden mb-6">
              <Image
                src={course.thumbnailUrl}
                alt={`${course.title} thumbnail`}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl mb-3">{course.title}</h1>

          {course.accreditationText && (
            <p className="text-xs text-success font-medium mb-4">
              ✓ {course.accreditationText}
            </p>
          )}

          <p className="text-gray-600 mb-6">{course.description}</p>

          <div className="flex items-center gap-3 mb-8">
            {course.tutor.avatarUrl && (
              <Image
                src={course.tutor.avatarUrl}
                alt={course.tutor.name}
                width={40}
                height={40}
                className="rounded-full"
              />
            )}
            <div>
              <p className="text-xs text-gray-400">Tutor</p>
              <p className="text-sm font-medium">{course.tutor.name}</p>
            </div>
          </div>

          {/* Curriculum */}
          <h2 className="text-xl mb-4">Course curriculum</h2>
          <p className="text-sm text-gray-400 mb-4">
            {totalLessons} lessons · {course.blocks.length} blocks
            {course.durationWeeks ? ` · ${course.durationWeeks} weeks` : ""}
          </p>

          <div className="space-y-3">
            {course.blocks.map((block, bi) => (
              <details key={block.id} className="card p-4" open={bi === 0}>
                <summary className="font-semibold cursor-pointer flex justify-between items-center">
                  <span>
                    Block {block.order}: {block.title}
                  </span>
                  <span className="text-xs text-gray-400">
                    {block.lessons.length} lessons
                  </span>
                </summary>
                {block.description && (
                  <p className="text-sm text-gray-500 mt-2 mb-3">
                    {block.description}
                  </p>
                )}
                <ul className="space-y-2 mt-3 list-none">
                  {block.lessons.map((lesson) => (
                    <li
                      key={lesson.id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span aria-hidden="true">
                        {lesson.type === "VIDEO"
                          ? "▶"
                          : lesson.type === "NOTES"
                          ? "📄"
                          : "✏️"}
                      </span>
                      <span className="flex-1">{lesson.title}</span>
                      {lesson.isFree ? (
                        <span className="text-xs text-success font-medium">
                          Free preview
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">🔒</span>
                      )}
                      {lesson.durationSec && (
                        <span className="text-xs text-gray-400">
                          {Math.round(lesson.durationSec / 60)} min
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </div>

        {/* Sidebar enrollment card */}
        <aside>
          <div className="card sticky top-20">
            <p className="text-3xl font-bold text-accent mb-1">
              UGX {course.fullFeeUgx.toLocaleString()}
            </p>
            {course.instalmentCount > 1 && (
              <p className="text-sm text-gray-400 mb-4">
                or{" "}
                {course.instalmentCount} instalments of UGX{" "}
                {Math.ceil(course.fullFeeUgx / course.instalmentCount).toLocaleString()}
              </p>
            )}
            <Link
              href={`/register?course=${course.slug}`}
              className="btn-primary w-full no-underline text-center mb-3"
            >
              Enrol now
            </Link>
            <Link
              href="/register?scholarship=1"
              className="btn-outline w-full no-underline text-center text-sm"
            >
              Apply for scholarship
            </Link>
            <ul className="mt-4 space-y-2 text-xs text-gray-500 list-none">
              <li>✓ Free preview of first {course.freePreviewPercent}% of lessons</li>
              <li>✓ Pay with MTN MoMo or Airtel Money</li>
              <li>✓ Nationally recognised certificate</li>
              <li>✓ Access on phone, tablet, or computer</li>
              {course.durationWeeks && (
                <li>✓ Complete in {course.durationWeeks} weeks</li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
