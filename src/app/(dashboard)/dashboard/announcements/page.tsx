import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import AnnouncementsClient from "./AnnouncementsClient";
export const dynamic = "force-dynamic";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrolments = await db.enrolment.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["ACTIVE", "COMPLETED", "PARTIALLY_PAID", "OVERDUE"] },
    },
    select: { courseId: true, course: { select: { id: true, title: true } } },
  });
  const courseIds = enrolments.map((e) => e.courseId);
  const courses = enrolments.map((e) => e.course);

  const announcements = await db.announcement.findMany({
    where: { OR: [{ courseId: { in: courseIds } }, { courseId: null }] },
    include: {
      author: { select: { name: true, role: true } },
      course: { select: { id: true, title: true } },
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  // Determine which announcement IDs have been "read" via their notification rows
  // A notification of type ANNOUNCEMENT or COURSE_ANNOUNCEMENT that has a readAt
  // means the student has seen that announcement.
  const announcementIds = announcements.map((a) => a.id);
  const readNotifications = await db.notification.findMany({
    where: {
      userId: session.user.id,
      type: { in: ["ANNOUNCEMENT", "COURSE_ANNOUNCEMENT"] },
      readAt: { not: null },
      metadata: { path: ["announcementId"], string_contains: "" }, // filter below in JS
    },
    select: { metadata: true, readAt: true },
  });

  // Extract the set of announcement IDs the student has read
  const readAnnouncementIds = new Set<string>();
  for (const n of readNotifications) {
    const meta = n.metadata as Record<string, unknown> | null;
    if (meta && typeof meta.announcementId === "string") {
      readAnnouncementIds.add(meta.announcementId);
    }
  }

  // Also treat any announcement created BEFORE the student's first active enrolment
  // as "already seen" if they have no notification row for it.
  const enriched = announcements.map((a) => ({
    ...a,
    isUnread: announcementIds.includes(a.id) && !readAnnouncementIds.has(a.id),
  }));

  const ROLE_LABEL: Record<string, string> = {
    DIRECTOR: "Director", PRINCIPAL: "Principal", ADMIN: "Admin",
    ACADEMIC_REGISTRAR: "Registrar", INSTRUCTOR: "Instructor",
    STUDENT: "Student", SYSTEM_IT: "IT Admin",
  };

  return (
    <AnnouncementsClient
      announcements={enriched.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        pinned: a.pinned,
        createdAt: a.createdAt.toISOString(),
        isUnread: a.isUnread,
        courseId: a.courseId ?? null,
        courseTitle: a.course?.title ?? null,
        authorName: a.author.name,
        authorRole: ROLE_LABEL[a.author.role] ?? a.author.role,
      }))}
      courses={courses.map((c) => ({ id: c.id, title: c.title }))}
    />
  );
}
