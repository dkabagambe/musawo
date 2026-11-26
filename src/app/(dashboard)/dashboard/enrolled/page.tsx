import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import AvatarOrInitials from "@/components/ui/AvatarOrInitials";
export const dynamic = "force-dynamic";

export const metadata = { title: "My Programmes - Student" };

export default async function MyProgrammesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          thumbnailUrl: true,
          courseCode: true,
          tutor: { select: { name: true, avatarUrl: true } },
          blocks: {
            select: {
              id: true,
              lessons: { select: { id: true, completedAt: true }, where: { isFree: false } },
            },
          },
        },
      },
      intake: { select: { label: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get user's registration number
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { studentNumber: true },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">My Programmes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {enrolments.length} enrolment{enrolments.length !== 1 ? "s" : ""}
        </p>
      </div>

      {enrolments.length === 0 ? (
        <div className="card py-16 text-center text-gray-400 text-sm">
          You are not enrolled in any programme yet.{" "}
          <Link href="/courses" className="text-accent underline">
            Browse courses
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {enrolments.map((e) => {
            // Calculate overall progress: completed lessons / total lessons
            const totalLessons = e.course.blocks.reduce((sum, block) => sum + block.lessons.length, 0);
            const completedLessons = e.course.blocks.reduce(
              (sum, block) => sum + block.lessons.filter((l) => l.completedAt).length,
              0
            );
            const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

            // Calculate payment phase progress
            const phaseStatus = getPhaseStatus(e.paidPercent);

            return (
              <Link
                key={e.id}
                href={`/dashboard/enrolled/${e.id}`}
                className="card hover:border-accent transition-colors no-underline"
              >
                <div className="space-y-3">
                  {/* Header: Course title + status */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-primary truncate">{e.course.title}</h3>
                      {e.course.courseCode && (
                        <p className="text-xs text-gray-400">{e.course.courseCode}</p>
                      )}
                      {user?.studentNumber && (
                        <p className="text-xs text-gray-400 mt-1">Registration: {user.studentNumber}</p>
                      )}
                    </div>
                    <span
                      className={`badge text-xs whitespace-nowrap ${
                        e.status === "ACTIVE" || e.status === "COMPLETED"
                          ? "badge-success"
                          : e.status === "OVERDUE"
                          ? "badge-danger"
                          : "badge-warning"
                      }`}
                    >
                      {e.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Intake + Instructor */}
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <p className="text-gray-500">{e.intake?.label ?? "No intake"}</p>
                    {e.course.tutor && (
                      <div className="flex items-center gap-2">
                        <AvatarOrInitials
                          name={e.course.tutor.name}
                          avatarUrl={e.course.tutor.avatarUrl}
                          size={28}
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{e.course.tutor.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress bar + percentage */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Learning progress
                      </span>
                      <span className="text-xs font-semibold text-primary">{progressPercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Payment phase */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Payment phases
                      </span>
                      <span className="text-xs font-semibold text-primary">{e.paidPercent}%</span>
                    </div>
                    <div className="flex gap-1">
                      {[0, 1, 2].map((phase) => {
                        const phaseThreshold = (phase + 1) * 33.33;
                        const isPassed = e.paidPercent >= phaseThreshold;
                        return (
                          <div
                            key={phase}
                            className={`flex-1 h-2 rounded-full text-xs flex items-center justify-center text-white font-bold ${
                              isPassed ? "bg-success" : "bg-gray-300 dark:bg-gray-600"
                            }`}
                            title={`Phase ${phase + 1}: ${phaseThreshold.toFixed(0)}%`}
                          />
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{phaseStatus}</p>
                  </div>

                  {/* Requirements checklist preview */}
                  <RequirementsChecklistPreview
                    paid={e.paidPercent >= 100}
                    lessonsCompleted={progressPercent >= 50}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Helper: Format payment phase status
 */
function getPhaseStatus(paidPercent: number): string {
  if (paidPercent >= 100) return "Phase 3 of 3: 100% (Full payment)";
  if (paidPercent >= 75) return "Phase 3 of 3: 75% paid";
  if (paidPercent >= 50) return "Phase 2 of 3: 50% paid";
  return "Phase 1 of 3: Not yet paid";
}

/**
 * Quick checklist preview
 */
function RequirementsChecklistPreview({
  paid,
  lessonsCompleted,
}: {
  paid: boolean;
  lessonsCompleted: boolean;
}) {
  const items = [
    { label: "50% fees paid", done: paid },
    { label: "Lessons completed", done: lessonsCompleted },
  ];

  return (
    <div className="pt-3 border-t border-border">
      <div className="text-xs text-gray-500 mb-2">Requirements</div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.label}
            className={`text-xs px-2 py-1 rounded-full ${
              item.done
                ? "bg-success/10 text-success border border-success/20"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
            }`}
          >
            {item.done ? "✓" : "○"} {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
