import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "My Courses" };

export default async function MyCoursesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id },
    include: {
      course: {
        select: {
          title: true,
          slug: true,
          thumbnailUrl: true,
          accreditationText: true,
          _count: { select: { blocks: true } },
          blocks: {
            select: {
              _count: { select: { lessons: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // For each enrolment, get completed lesson count
  const progressData = await db.lessonProgress.groupBy({
    by: ["userId"],
    where: {
      userId: session.user.id,
      completedAt: { not: null },
    },
    _count: { lessonId: true },
  });
  const completedCount = progressData[0]?._count.lessonId ?? 0;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl mb-6">My Courses</h1>

      {enrolments.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-4xl mb-4" aria-hidden="true">📚</p>
          <h2 className="text-lg font-semibold mb-2">No courses yet</h2>
          <p className="text-gray-500 text-sm mb-6">
            Browse our accredited health-worker courses and enrol today.
          </p>
          <Link href="/courses" className="btn-primary no-underline">
            Browse courses
          </Link>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        {enrolments.map((enr) => {
          const totalLessons = enr.course.blocks.reduce(
            (sum, b) => sum + b._count.lessons,
            0
          );

          const statusLabel = {
            PENDING_PAYMENT: "Pending payment",
            ACTIVE: "Active",
            COMPLETED: "Completed",
            SUSPENDED: "Suspended",
            REFUNDED: "Refunded",
          }[enr.status];

          const statusClass = {
            PENDING_PAYMENT: "badge-warning",
            ACTIVE: "badge-info",
            COMPLETED: "badge-success",
            SUSPENDED: "badge-danger",
            REFUNDED: "badge-danger",
          }[enr.status];

          const canAccess =
            enr.status === "ACTIVE" || enr.status === "COMPLETED";

          return (
            <div key={enr.id} className="card flex flex-col">
              {/* Thumbnail */}
              <div className="h-36 bg-primary/10 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                {enr.course.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={enr.course.thumbnailUrl}
                    alt={enr.course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl" aria-hidden="true">📚</span>
                )}
              </div>

              <div className="flex items-start justify-between mb-2">
                <h2 className="font-semibold leading-tight flex-1 mr-2">
                  {enr.course.title}
                </h2>
                <span className={`badge ${statusClass} flex-shrink-0`}>
                  {statusLabel}
                </span>
              </div>

              {enr.course.accreditationText && (
                <p className="text-xs text-success mb-3">
                  ✓ {enr.course.accreditationText}
                </p>
              )}

              {/* Progress */}
              {totalLessons > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>
                      {completedCount}/{totalLessons} lessons
                    </span>
                  </div>
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full transition-all"
                      style={{
                        width: `${
                          totalLessons > 0
                            ? Math.round((completedCount / totalLessons) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-auto">
                {canAccess ? (
                  <Link
                    href={`/dashboard/courses/${enr.course.slug}`}
                    className="btn-primary w-full no-underline text-center text-sm"
                  >
                    Continue learning
                  </Link>
                ) : enr.status === "PENDING_PAYMENT" ? (
                  <Link
                    href={`/courses/${enr.course.slug}`}
                    className="btn-outline w-full no-underline text-center text-sm"
                  >
                    Complete payment
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
