import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import AnnouncementComposer from "./AnnouncementComposer";

export const metadata = { title: "Class announcements" };

export default async function TutorAnnouncementsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "announcements.send.own")) redirect("/403");
  const [courses, announcements] = await Promise.all([
    db.course.findMany({ where: teachingCourseWhere(session.user.id), select: { id: true, title: true }, orderBy: { title: "asc" } }),
    db.announcement.findMany({ where: { authorId: session.user.id, course: teachingCourseWhere(session.user.id) }, orderBy: { createdAt: "desc" }, take: 50, include: { course: { select: { title: true } } } }),
  ]);
  return <AnnouncementComposer courses={courses} initial={announcements.map((item) => ({ id: item.id, title: item.title, body: item.body, course: item.course?.title ?? "Course", createdAt: item.createdAt.toISOString() }))} />;
}
