import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { can } from "@/lib/rbac";
import Link from "next/link";
import { BookOpen, Users, Calendar, FileText, ChevronRight, CheckCircle2 } from "lucide-react";
export const dynamic = "force-dynamic";

export const metadata = { title: "Course Detail - Teaching Portal" };

export default async function TutorCourseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "courses.view")) redirect("/403");

  const course = await db.course.findFirst({
    where: { id: params.id, ...teachingCourseWhere(session.user.id) },
    include: {
      blocks: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, type: true, isFree: true, isFreePreview: true },
          },
        },
      },
      _count: { select: { enrolments: true, liveClasses: true } },
    },
  });

  if (!course) notFound();

  const [upcomingClasses, enrolments] = await Promise.all([
    db.liveClass.findMany({
      where: {
        courseId: course.id,
        status: { in: ["SCHEDULED", "LIVE"] },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
    db.enrolment.findMany({
      where: {
        courseId: course.id,
        status: { in: ["ACTIVE", "COMPLETED", "PARTIALLY_PAID", "OVERDUE"] },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            studentNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  // Per-student lesson progress
  const userIds = enrolments.map((e) => e.user.id);
  const lessonIds = course.blocks.flatMap((b) => b.lessons.map((l) => l.id));
  const totalLessons = lessonIds.length;

  const progressRows = userIds.length > 0 && lessonIds.length > 0
    ? await db.lessonProgress.groupBy({
        by: ["userId"],
        where: {
          userId: { in: userIds },
          lessonId: { in: lessonIds },
          completedAt: { not: null },
        },
        _count: { lessonId: true },
      })
    : [];

  const progressByUser = new Map(progressRows.map((r) => [r.userId, r._count.lessonId]));

  const STATUS_BADGE: Record<string, string> = {
    ACTIVE: "badge-success",
    COMPLETED: "bg-blue-100 text-blue-800 border-blue-300",
    PARTIALLY_PAID: "badge-warning",
    OVERDUE: "badge-danger",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Back */}
      <Link
        href="/tutor/courses"
        className="text-sm text-gray-400 hover:text-primary no-underline inline-flex items-center gap-1"
      >
        <ChevronRight className="w-3.5 h-3.5 rotate-180" /> My Courses
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary">{course.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{course.shortDescription ?? course.description?.slice(0, 120)}</p>
        </div>
        <span className={`badge flex-shrink-0 ${course.status === "PUBLISHED" ? "badge-success" : "badge-warning"}`}>
          {course.status}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: <Users className="w-4 h-4" />, value: course._count.enrolments, label: "Enrolments" },
          { icon: <BookOpen className="w-4 h-4" />, value: course.blocks.length, label: "Blocks" },
          { icon: <FileText className="w-4 h-4" />, value: totalLessons, label: "Lessons" },
          { icon: <Calendar className="w-4 h-4" />, value: upcomingClasses.length, label: "Upcoming classes" },
        ].map((s) => (
          <div key={s.label} className="card text-center py-5">
            <div className="flex justify-center text-primary mb-2">{s.icon}</div>
            <p className="text-2xl font-bold text-primary">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Course units / blocks */}
      <section>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Course Units</h2>
        {course.blocks.length === 0 ? (
          <p className="text-sm text-gray-400 card py-6 text-center">No blocks added to this course yet.</p>
        ) : (
          <div className="space-y-3">
            {course.blocks.map((block) => (
              <details key={block.id} className="card group">
                <summary className="cursor-pointer flex items-center justify-between gap-3 list-none">
                  <div>
                    <span className="font-semibold text-primary">Block {block.order}: {block.title}</span>
                    <span className="text-xs text-gray-400 ml-2">{block.lessons.length} lesson{block.lessons.length !== 1 ? "s" : ""}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform flex-shrink-0" />
                </summary>
                {block.lessons.length > 0 && (
                  <ul className="mt-3 divide-y divide-border">
                    {block.lessons.map((lesson) => (
                      <li key={lesson.id} className="flex items-center gap-3 py-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center flex-shrink-0">
                          {lesson.type === "VIDEO" ? "▶" : lesson.type === "NOTES" ? "📄" : "📝"}
                        </span>
                        <span className="flex-1 text-gray-700">{lesson.title}</span>
                        {lesson.isFreePreview && (
                          <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">Preview</span>
                        )}
                        {lesson.isFree && (
                          <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">Free</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming classes */}
      {upcomingClasses.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Upcoming Classes</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-border">
                  <th className="pb-2 font-medium pr-4">Title</th>
                  <th className="pb-2 font-medium pr-4">Date and time</th>
                  <th className="pb-2 font-medium pr-4">Duration</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {upcomingClasses.map((cls) => (
                  <tr key={cls.id} className="hover:bg-surface/40">
                    <td className="py-2.5 pr-4 font-medium">{cls.title}</td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500">
                      {new Date(cls.scheduledAt).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })} EAT
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500">{cls.durationMin} min</td>
                    <td className="py-2.5">
                      <span className={`badge text-xs ${cls.status === "LIVE" ? "badge-danger" : "badge-info"}`}>
                        {cls.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Students / progress */}
      {enrolments.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
              Students ({enrolments.length})
            </h2>
            <Link href={`/tutor/students`} className="text-xs text-primary hover:underline no-underline">
              View all students
            </Link>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-border">
                  <th className="pb-2 font-medium pr-4">Student</th>
                  <th className="pb-2 font-medium pr-4 hidden sm:table-cell">Student No.</th>
                  <th className="pb-2 font-medium pr-4">Status</th>
                  {totalLessons > 0 && (
                    <th className="pb-2 font-medium pr-4 hidden md:table-cell">Progress</th>
                  )}
                  <th className="pb-2 font-medium hidden sm:table-cell">Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {enrolments.map((enr) => {
                  const done = progressByUser.get(enr.user.id) ?? 0;
                  const pct = totalLessons > 0 ? Math.round((done / totalLessons) * 100) : null;
                  return (
                    <tr key={enr.id} className="hover:bg-surface/40">
                      <td className="py-2.5 pr-4 font-medium">{enr.user.name}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-gray-500 hidden sm:table-cell">
                        {enr.user.studentNumber ?? "-"}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`badge text-xs ${STATUS_BADGE[enr.status] ?? "badge-info"}`}>
                          {enr.status.replace("_", " ")}
                        </span>
                      </td>
                      {totalLessons > 0 && (
                        <td className="py-2.5 pr-4 hidden md:table-cell">
                          {pct !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-20">
                                <div
                                  className="bg-primary rounded-full h-1.5"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{pct}%</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      )}
                      <td className="py-2.5 text-xs text-gray-400 hidden sm:table-cell">
                        {new Date(enr.createdAt).toLocaleDateString("en-UG")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Quick links */}
      <section>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Links</h2>
        <div className="flex flex-wrap gap-3">
          <Link href={`/tutor/timetable`} className="btn-outline text-sm no-underline">
            Timetable
          </Link>
          <Link href={`/tutor/attendance`} className="btn-outline text-sm no-underline">
            Attendance
          </Link>
          <Link href={`/tutor/materials`} className="btn-outline text-sm no-underline">
            Materials
          </Link>
          <Link href={`/tutor/assignments`} className="btn-outline text-sm no-underline">
            Assignments
          </Link>
          {course.status === "PUBLISHED" && (
            <Link
              href={`/courses/${course.slug}`}
              target="_blank"
              className="btn-secondary text-sm no-underline flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> View public page
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
