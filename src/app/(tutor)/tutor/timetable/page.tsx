import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import TimetableView from "./TimetableView";
export const dynamic = "force-dynamic";

export const metadata = { title: "Timetable - Teaching Portal" };

export default async function TutorTimetablePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const classes = await db.liveClass.findMany({
    where: { course: teachingCourseWhere(session.user.id) },
    orderBy: { scheduledAt: "asc" },
    include: {
      course: { select: { id: true, title: true, courseCode: true } },
      block: { select: { id: true, title: true, order: true } },
      _count: { select: { attendance: true } },
    },
  });

  const courses = await db.course.findMany({
    where: teachingCourseWhere(session.user.id),
    select: { id: true, title: true, courseCode: true },
    orderBy: { title: "asc" },
  });

  const serialised = classes.map((c) => ({
    id: c.id,
    title: c.title,
    scheduledAt: c.scheduledAt.toISOString(),
    durationMin: c.durationMin,
    joinUrl: c.joinUrl,
    platform: c.platform,
    status: c.status,
    venue: c.venue,
    recordingUrl: c.recordingUrl,
    cancelReason: c.cancelReason,
    rescheduleReason: c.rescheduleReason,
    originalScheduledAt: c.originalScheduledAt?.toISOString() ?? null,
    studentCount: c._count.attendance,
    course: c.course,
    block: c.block,
  }));

  return (
    <TimetableView
      initialClasses={serialised}
      courses={courses}
      userId={session.user.id}
    />
  );
}
