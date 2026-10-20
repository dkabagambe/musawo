import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import AttendanceManager from "./AttendanceManager";

export const metadata = { title: "Attendance - Teaching Portal" };

export default async function TutorAttendancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "attendance.view")) redirect("/403");
  const classes = await db.liveClass.findMany({
    where: { course: teachingCourseWhere(session.user.id) },
    orderBy: { scheduledAt: "desc" },
    take: 100,
    include: { course: { select: { title: true } } },
  });
  return <AttendanceManager classes={classes.map((c) => ({ id: c.id, courseId: c.courseId, title: c.title, course: c.course.title, scheduledAt: c.scheduledAt.toISOString(), status: c.status }))} canMark={can(session.user.role, "attendance.take")} canAdmit={can(session.user.role, "classes.manage")} canExport={can(session.user.role, "attendance.export")} />;
}
