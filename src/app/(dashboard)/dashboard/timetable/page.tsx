import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import StudentTimetableView, {
  type StudentTimetableClass,
} from "./StudentTimetableView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Timetable" };

export default async function TimetablePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Fetch all classes for the student's enrolled courses (all statuses)
  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED", "OVERDUE"] } },
    select: { courseId: true },
  });
  const courseIds = enrolments.map((e) => e.courseId);
  if (courseIds.length === 0) {
    return (
      <StudentTimetableView initialClasses={[]} courses={[]} />
    );
  }

  const classes = await db.liveClass.findMany({
    where: { courseId: { in: courseIds } },
    orderBy: { scheduledAt: "asc" },
    include: {
      course: { select: { id: true, title: true, courseCode: true } },
      tutor: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  // Fetch the student's attendance marks for these classes
  const attendance = await db.attendance.findMany({
    where: { userId: session.user.id, liveClassId: { in: classes.map((c) => c.id) } },
    select: { liveClassId: true, startMark: true, endMark: true },
  });
  const attByClass = new Map(attendance.map((a) => [a.liveClassId, { startMark: a.startMark, endMark: a.endMark }]));

  const timetableClasses: StudentTimetableClass[] = classes.map((cls) => ({
    id: cls.id,
    title: cls.title,
    scheduledAt: cls.scheduledAt.toISOString(),
    durationMin: cls.durationMin,
    joinUrl: cls.joinUrl,
    platform: cls.platform,
    status: cls.status,
    venue: cls.venue,
    cancelReason: cls.cancelReason,
    rescheduleReason: cls.rescheduleReason,
    originalScheduledAt: cls.originalScheduledAt?.toISOString() ?? null,
    recordingUrl: cls.recordingUrl,
    course: { id: cls.course.id, title: cls.course.title, courseCode: cls.course.courseCode },
    tutor: { id: cls.tutor.id, name: cls.tutor.name, avatarUrl: cls.tutor.avatarUrl },
    attendance: attByClass.get(cls.id) ?? null,
  }));

  // Build course list for the colour legend
  const courses = Array.from(
    new Map(classes.map((c) => [c.course.id, c.course])).values(),
  ).map((c) => ({ id: c.id, title: c.title, courseCode: c.courseCode }));

  return (
    <StudentTimetableView initialClasses={timetableClasses} courses={courses} />
  );
}
