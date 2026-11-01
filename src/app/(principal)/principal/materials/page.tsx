import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata = { title: "Learning Materials - Principal" };

interface Props {
  searchParams: { courseId?: string };
}

const LESSON_ICON: Record<string, string> = {
  VIDEO: "🎥",
  NOTES: "📄",
  QUIZ:  "📝",
};

export default async function PrincipalMaterialsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) redirect("/403");

  const courses = await db.course.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  const selectedCourseId = searchParams.courseId ?? courses[0]?.id ?? null;

  const lessons = selectedCourseId
    ? await db.lesson.findMany({
        where: { block: { courseId: selectedCourseId } },
        orderBy: [{ block: { order: "asc" } }, { order: "asc" }],
        include: {
          block: { select: { title: true } },
        },
      })
    : [];

  // Group by block title
  const blocks = Array.from(new Map(lessons.map((l) => [l.block.title, l.block.title])).values());

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Learning Materials</h1>
        <p className="text-sm text-gray-500 mt-1">
          View course content. All materials are read or watched inside the platform only.
        </p>
      </div>

      {/* Course selector */}
      {courses.length > 0 && (
        <form method="GET" className="flex gap-3 mb-6 items-center">
          <label className="text-sm font-medium text-gray-600">Programme:</label>
          <select name="courseId" className="input w-auto" defaultValue={selectedCourseId ?? ""}>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary text-sm">View</button>
        </form>
      )}

      {lessons.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📖</p>
          <p className="text-gray-500 text-sm">No materials in this programme yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {blocks.map((blockTitle) => {
            const blockLessons = lessons.filter((l) => l.block.title === blockTitle);
            return (
              <div key={blockTitle} className="card">
                <h2 className="font-semibold text-base mb-3">{blockTitle}</h2>
                <div className="space-y-2">
                  {blockLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                    >
                      <span className="text-base flex-shrink-0" aria-hidden="true">
                        {LESSON_ICON[lesson.type] ?? "📄"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{lesson.title}</p>
                        <p className="text-xs text-gray-400">{lesson.type}</p>
                      </div>
                      {lesson.isFreePreview && (
                        <span className="badge badge-info text-xs flex-shrink-0">Preview</span>
                      )}
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
