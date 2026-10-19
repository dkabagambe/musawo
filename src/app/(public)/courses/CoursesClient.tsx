'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { ArrowRight, Clock, Users, BookOpen } from 'lucide-react';

export interface CourseItem {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  fullFeeUgx: number | null;
  feeContactOnly?: boolean;
  durationWeeks: number | null;
  durationMonths: number | null;
  instalmentCount: number;
  tutorName: string | null;
  lessonCount: number;
  enrolmentCount: number;
  img: string;
  category: string;
}

const FILTERS = ['All', 'Open to all', 'Professionals'] as const;
type Filter = (typeof FILTERS)[number];

interface Props {
  courses: CourseItem[];
}

export default function CoursesClient({ courses }: Props) {
  const [active, setActive] = useState<Filter>('All');

  const filtered =
    active === 'All'
      ? courses
      : active === 'Professionals'
        ? courses.filter((c) => c.category === 'PROFESSIONAL')
        : courses.filter((c) => c.category !== 'PROFESSIONAL');

  return (
    <LazyMotion features={domAnimation}>
      {/* Filter chips */}
      <div className="flex flex-wrap gap-3 mb-10" role="group" aria-label="Filter courses by category">
        {FILTERS.map((f) => (
          <m.button
            key={f}
            type="button"
            onClick={() => setActive(f)}
            whileTap={{ scale: 0.96 }}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 border ${
              active === f
                ? 'bg-primary text-white border-primary shadow-primary-glow'
                : 'bg-white text-gray-600 border-border hover:border-primary hover:text-primary'
            }`}
            aria-pressed={active === f}
            suppressHydrationWarning
          >
            {f}
          </m.button>
        ))}
      </div>

      {/* Course grid */}
      <AnimatePresence mode="wait">
        <m.div
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          suppressHydrationWarning
        >
          {filtered.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" aria-hidden="true" />
              <p>No courses in this category yet.</p>
            </div>
          ) : (
            filtered.map((course) => {
              const duration = course.durationMonths
                ? `${course.durationMonths} month${course.durationMonths > 1 ? 's' : ''}`
                : course.durationWeeks
                  ? `${course.durationWeeks} weeks`
                  : null;
              const isProfessional = course.category === 'PROFESSIONAL';

              return (
                <m.article
                  key={course.id}
                  whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.12)' }}
                  className="bg-white rounded-2xl overflow-hidden shadow-card border border-border flex flex-col group cursor-default"
                  suppressHydrationWarning
                >
                  <div className="relative h-52 overflow-hidden">
                    <Image
                      src={course.img}
                      alt={course.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    />
                    {duration && (
                      <span className="absolute top-3 right-3 bg-white/90 text-primary text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        {duration}
                      </span>
                    )}
                    <span
                      className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                        isProfessional ? 'bg-primary text-white' : 'bg-success/90 text-white'
                      }`}
                    >
                      {isProfessional ? 'Professionals' : 'Open to all'}
                    </span>
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    <h2 className="text-base font-bold text-primary mb-2 leading-snug">{course.title}</h2>
                    {course.shortDescription && (
                      <p className="text-sm text-gray-500 flex-1 leading-relaxed line-clamp-2 mb-3">
                        {course.shortDescription}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-gray-400 mb-4">
                      {course.lessonCount > 0 && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" aria-hidden="true" /> {course.lessonCount} lessons
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" aria-hidden="true" /> {course.enrolmentCount} enrolled
                      </span>
                    </div>

                    <div className="mt-auto pt-4 border-t border-border flex items-center justify-between gap-3">
                      <div>
                        {course.feeContactOnly || !course.fullFeeUgx ? (
                          <p className="text-sm font-semibold text-gray-500">Fee: contact admissions</p>
                        ) : (
                          <>
                            <p className="text-accent font-extrabold text-lg leading-none">
                              UGX {course.fullFeeUgx.toLocaleString()}
                            </p>
                            {course.instalmentCount > 1 && (
                              <p className="text-xs text-gray-400 mt-0.5">or {course.instalmentCount} instalments</p>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/courses/${course.slug}`}
                          className="text-xs font-semibold text-primary hover:text-accent no-underline transition-colors border border-border px-3 py-1.5 rounded-xl"
                        >
                          View details
                        </Link>
                        <Link
                          href={`/apply?course=${course.slug}`}
                          className="inline-flex items-center gap-1 bg-accent hover:bg-accent-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl no-underline transition-colors"
                        >
                          Apply <ArrowRight className="w-3 h-3" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </m.article>
              );
            })
          )}
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
}
