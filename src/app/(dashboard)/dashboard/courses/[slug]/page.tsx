import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getBunnySignedUrl } from "@/lib/bunny";
import { getPresignedDownloadUrl } from "@/lib/s3";
import { canAccessLesson, getAccessLevel } from "@/lib/enrolment/access";
import CoursePlayerClient from "./CoursePlayerClient";

interface Props {
  params: { slug: string };
  searchParams: { lesson?: string };
}

export async function generateMetadata({ params }: Props) {
  const course = await db.course.findUnique({ where: { slug: params.slug }, select: { title: true } });
  return { title: course ? `${course.title} — My Courses` : "Course" };
}

export default async function CoursePlayerPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const course = await db.course.findUnique({
    where: { slug: params.slug, status: "PUBLISHED" },
    include: {
      tutor: { select: { name: true } },
      blocks: {
        orderBy: { order: "asc" },
        include: {
          lessons: { orderBy: { order: "asc" } },
          exams: {
            where: { status: "PUBLISHED" },
            select: { id: true, title: true, timeLimitMin: true, attemptLimit: true, passPercent: true },
          },
          assignments: {
            where: { status: "PUBLISHED" },
            select: { id: true, title: true, dueDate: true },
          },
        },
      },
    },
  });

  if (!course) notFound();

  // Check enrolment — allow PREVIEW access (show locked state)
  const enrolment = await db.enrolment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
  });

  const accessInfo = enrolment ? {
    status: enrolment.status,
    paidPercent: enrolment.paidPercent,
    unlockedBlockOrder: enrolment.unlockedBlockOrder,
    provisionalUntil: enrolment.provisionalUntil,
    graceUntil: enrolment.graceUntil,
    overdueSince: enrolment.overdueSince,
  } : null;

  const level = getAccessLevel(accessInfo);

  // PENDING with no provisional access — redirect to course public page
  if (!enrolment || level === "PENDING") {
    redirect(`/courses/${course.slug}`);
  }

  // Get progress
  const progress = await db.lessonProgress.findMany({
    where: { userId: session.user.id, lesson: { block: { courseId: course.id } } },
  });
  const completedLessonIds = new Set(progress.filter((p) => p.completedAt).map((p) => p.lessonId));

  // Determine active lesson
  const allLessons = course.blocks.flatMap((b) => b.lessons);
  const activeLessonId = searchParams.lesson ?? allLessons[0]?.id;
  const activeLesson = allLessons.find((l) => l.id === activeLessonId) ?? allLessons[0];
  const activeBlock = course.blocks.find((b) => b.lessons.some((l) => l.id === activeLesson?.id));

  // Generate signed URLs for active lesson
  let videoUrl: string | null = null;
  let notesUrl: string | null = null;

  if (activeLesson && activeBlock) {
    const accessible = canAccessLesson(
      { isFree: activeLesson.isFree, isFreePreview: activeLesson.isFreePreview },
      { order: activeBlock.order },
      accessInfo
    );
    if (accessible) {
      if (activeLesson.type === "VIDEO" && activeLesson.bunnyVideoId) {
        videoUrl = getBunnySignedUrl(activeLesson.bunnyVideoId, 3600);
      }
      if (activeLesson.type === "NOTES" && activeLesson.notesS3Key) {
        try { notesUrl = await getPresignedDownloadUrl(activeLesson.notesS3Key, 1800); } catch { /* skip */ }
      }
    }
  }

  // Calculate overall progress %
  const totalLessons = allLessons.length;
  const completedCount = completedLessonIds.size;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Announcements for this course
  const announcements = await db.announcement.findMany({
    where: { courseId: course.id },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true, title: true, body: true, createdAt: true, pinned: true },
  });

  return (
    <CoursePlayerClient
      course={{
        ...course,
        blocks: course.blocks.map((b) => ({
          ...b,
          assignments: b.assignments.map((a) => ({
            ...a,
            dueDate: a.dueDate ? a.dueDate.toISOString() : null,
          })),
        })),
      }}
      enrolment={{
        id: enrolment.id,
        unlockedBlockOrder: enrolment.unlockedBlockOrder,
        status: enrolment.status,
      }}
      activeLessonId={activeLesson?.id ?? null}
      videoUrl={videoUrl}
      notesUrl={notesUrl}
      completedLessonIds={Array.from(completedLessonIds)}
      progressPercent={progressPercent}
      announcements={announcements.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  );
}
