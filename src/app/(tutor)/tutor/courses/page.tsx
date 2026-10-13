import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "My Courses - Tutor" };

export default async function TutorCoursesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const courses = await db.course.findMany({
    where: { tutorId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { enrolments: true, blocks: true } },
      blocks: { select: { _count: { select: { lessons: true } } } },
    },
  });

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl mb-6">My Courses</h1>

      {courses.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-gray-500 text-sm">You are not assigned to any courses yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {courses.map((c) => {
            const totalLessons = c.blocks.reduce((s, b) => s + b._count.lessons, 0);
            return (
              <div key={c.id} className="card">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="font-semibold leading-snug">{c.title}</h2>
                  <span className={`badge text-xs ${c.status === "PUBLISHED" ? "badge-success" : "badge-warning"}`}>
                    {c.status}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-gray-500 mb-4">
                  <span>📦 {c._count.blocks} blocks</span>
                  <span>📖 {totalLessons} lessons</span>
                  <span>👥 {c._count.enrolments} enrolled</span>
                </div>
                <Link href={`/courses/${c.slug}`} target="_blank" className="btn-outline text-sm no-underline">
                  View course ↗
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
