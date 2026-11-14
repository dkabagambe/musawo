import { auth } from "@/lib/auth/server";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Users } from "lucide-react";
import TutorStudentsClient from "./TutorStudentsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Students" };

export default async function TutorStudentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "students.view")) redirect("/403");

  const enrolments = await db.enrolment.findMany({
    where: {
      status: { in: ["ACTIVE", "COMPLETED", "PARTIALLY_PAID", "OVERDUE"] },
      user: { role: "STUDENT" },
      course: teachingCourseWhere(session.user.id),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          studentNumber: true,
          avatarUrl: true,
          role: true,
        },
      },
      course: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const userIds = Array.from(new Set(enrolments.map((e) => e.user.id)));
  const courseIds = Array.from(new Set(enrolments.map((e) => e.courseId)));

  // Attendance % per student across all classes in tutor's courses
  const attendanceRows = userIds.length > 0
    ? await db.$queryRaw<Array<{ userId: string; total: bigint; present: bigint }>>`
        SELECT a."userId",
               COUNT(*) as total,
               COUNT(*) FILTER (WHERE a."markedPresent" = true OR a."startMark" = 'PRESENT' OR a."startMark" = 'LATE') as present
        FROM attendance a
        JOIN live_classes lc ON lc.id = a."liveClassId"
        WHERE a."userId" = ANY(${userIds}::text[])
          AND lc."courseId" = ANY(${courseIds}::text[])
        GROUP BY a."userId"
      `
    : [];

  const attendanceMap = new Map(
    attendanceRows.map((r) => [
      r.userId,
      Number(r.total) > 0 ? Math.round((Number(r.present) / Number(r.total)) * 100) : 0,
    ])
  );

  // Last lesson progress activity per user (as a proxy for "last active")
  const progressRows = userIds.length > 0
    ? await db.lessonProgress.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds } },
        _max: { updatedAt: true },
      })
    : [];
  const lastActiveMap = new Map(
    progressRows.map((r) => [r.userId, r._max.updatedAt])
  );

  const now = new Date();
  const rows = enrolments.map((e) => {
    const attendancePct = attendanceMap.has(e.user.id) ? attendanceMap.get(e.user.id)! : null;
    const lastActive = lastActiveMap.get(e.user.id);
    const lastActiveDaysAgo = lastActive
      ? Math.floor((now.getTime() - lastActive.getTime()) / 86400000)
      : null;
    return {
      id: e.id,
      status: e.status,
      createdAt: e.createdAt.toISOString(),
      attendancePct,
      lastActiveDaysAgo,
      courseTitle: e.course.title,
      courseId: e.courseId,
      user: {
        id: e.user.id,
        name: e.user.name,
        email: e.user.email ?? null,
        phone: e.user.phone ?? null,
        studentNumber: e.user.studentNumber ?? null,
        avatarUrl: e.user.avatarUrl ?? null,
        role: e.user.role,
      },
    };
  });

  const courseOptions = Array.from(new Map(enrolments.map((e) => [e.courseId, { id: e.courseId, title: e.course.title }])).values());

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-primary">My Students</h1>
        <p className="text-gray-500 text-sm mt-1">
          {enrolments.length} enrolled student{enrolments.length !== 1 ? "s" : ""}
        </p>
      </div>

      {enrolments.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-12 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-primary/40" />
          </div>
          <p className="text-gray-500 text-sm">No students enrolled in your courses yet.</p>
        </div>
      ) : (
        <TutorStudentsClient
          currentUserId={session.user.id}
          rows={rows}
          courseOptions={courseOptions}
        />
      )}
    </div>
  );
}
