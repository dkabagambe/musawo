import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { BookOpen, FileText, Video, Lock } from "lucide-react";
import { getAccessLevel } from "@/lib/enrolment/access";
export const dynamic = "force-dynamic";


export const metadata = { title: "Learning Materials - Student" };

export default async function StudentMaterialsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] } },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          blocks: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              order: true,
              lessons: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  title: true,
                  type: true,
                  durationSec: true,
                  isFree: true,
                  notesS3Key: true,
                  bunnyVideoId: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const accessible = enrolments.filter((e) =>
    getAccessLevel({
      status: e.status,
      paidPercent: e.paidPercent ?? 0,
      provisionalUntil: e.provisionalUntil,
      graceUntil: e.graceUntil,
      overdueSince: e.overdueSince,
    }) !== "NONE"
  );

  const TYPE_ICON: Record<string, React.ReactNode> = {
    VIDEO: <Video className="w-4 h-4 text-primary" />,
    NOTES: <FileText className="w-4 h-4 text-accent" />,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Learning Materials</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          All materials are read or watched inside the platform. Downloads are not available.
        </p>
      </div>

      {accessible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6 text-primary/40" />
          </div>
          <p className="text-gray-500 text-sm">No course materials available yet.</p>
          <Link href="/dashboard/enrolled" className="text-accent text-sm font-semibold mt-2 inline-block no-underline hover:underline">
            View my programmes
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {accessible.map((enrolment) => {
            const course = enrolment.course;
            const totalLessons = course.blocks.reduce((s, b) => s + b.lessons.length, 0);
            const totalVideos = course.blocks.reduce(
              (s, b) => s + b.lessons.filter((l) => l.type === "VIDEO" && l.bunnyVideoId).length,
              0,
            );
            const totalNotes = course.blocks.reduce(
              (s, b) => s + b.lessons.filter((l) => l.type === "NOTES" && l.notesS3Key).length,
              0,
            );
            return (
              <div key={enrolment.id} className="card">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-border gap-4 flex-wrap">
                  <div>
                    <h2 className="font-bold text-primary">{course.title}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {totalLessons} lesson{totalLessons !== 1 ? "s" : ""} &middot;
                      {totalVideos} video{totalVideos !== 1 ? "s" : ""} &middot;
                      {totalNotes} note file{totalNotes !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/courses/${course.slug}`}
                    className="btn-secondary text-sm no-underline flex-shrink-0"
                  >
                    Open course
                  </Link>
                </div>

                <div className="space-y-3">
                  {course.blocks.map((block) => (
                    <div key={block.id}>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                        {block.title}
                      </p>
                      <div className="space-y-1">
                        {block.lessons.map((lesson) => {
                          const hasContent =
                            (lesson.type === "VIDEO" && lesson.bunnyVideoId) ||
                            (lesson.type === "NOTES" && lesson.notesS3Key);
                          return (
                            <Link
                              key={lesson.id}
                              href={`/dashboard/courses/${course.slug}?lesson=${lesson.id}`}
                              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface transition-colors no-underline group"
                            >
                              <span className="flex-shrink-0">
                                {hasContent
                                  ? (TYPE_ICON[lesson.type] ?? <FileText className="w-4 h-4 text-gray-400" />)
                                  : <Lock className="w-4 h-4 text-gray-300" />}
                              </span>
                              <span className="flex-1 min-w-0 text-sm text-gray-700 group-hover:text-primary truncate">
                                {lesson.title}
                              </span>
                              {lesson.type === "VIDEO" && lesson.durationSec && (
                                <span className="text-xs text-gray-400 flex-shrink-0">
                                  {Math.floor(lesson.durationSec / 60)} min
                                </span>
                              )}
                            </Link>
                          );
                        })}
                        {block.lessons.length === 0 && (
                          <p className="text-xs text-gray-400 pl-3">No lessons in this block yet.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
