import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import AnnouncementComposer from "./AnnouncementComposer";
export const dynamic = "force-dynamic";

export const metadata = { title: "Announcements" };

export default async function TutorAnnouncementsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "announcements.send.own")) redirect("/403");

  const [courses, announcements, classes] = await Promise.all([
    db.course.findMany({
      where: teachingCourseWhere(session.user.id),
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    db.announcement.findMany({
      where: { authorId: session.user.id, course: teachingCourseWhere(session.user.id) },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { course: { select: { title: true } } },
    }),
    db.liveClass.findMany({
      where: {
        course: teachingCourseWhere(session.user.id),
        status: { in: ["SCHEDULED", "LIVE"] },
      },
      select: { id: true, title: true, courseId: true },
      orderBy: { scheduledAt: "asc" },
      take: 50,
    }),
  ]);

  return (
    <AnnouncementComposer
      courses={courses}
      classes={classes}
      initial={announcements.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        course: item.course?.title ?? "Site-wide",
        createdAt: item.createdAt.toISOString(),
      }))}
    />
  );
}
