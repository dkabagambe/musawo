import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, ArrowRight, CheckCircle2 } from "lucide-react";

export const metadata = { title: "My Courses" };

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:          "bg-success/10 text-success",
  COMPLETED:       "bg-primary/10 text-primary",
  PARTIALLY_PAID:  "bg-warning/10 text-amber-700",
  PENDING_PAYMENT: "bg-warning/10 text-amber-700",
  OVERDUE:         "bg-danger/10 text-danger",
  SUSPENDED:       "bg-danger/10 text-danger",
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active", COMPLETED: "Completed", PARTIALLY_PAID: "Partially paid",
  PENDING_PAYMENT: "Pending payment", OVERDUE: "Overdue",
SUSPENDED: "Suspended",
};

export default async function MyCoursesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id },
    include: {
      course: {
        select: {
          title: true, slug: true, thumbnailUrl: true,
          accreditationText: true, durationWeeks: true,
          blocks: { select: { _count: { select: { lessons: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Per-course lesson progress
  const progressRows = await db.lessonProgress.groupBy({
    by: ["userId"],
    where: { userId: session.user.id, completedAt: { not: null } },
    _count: { lessonId: true },
  });
  const completedCount = progressRows[0]?._count.lessonId ?? 0;

  const canAccess = (status: string) =>
    ["ACTIVE","PARTIALLY_PAID","OVERDUE","COMPLETED"].includes(status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">My Courses</h1>
          <p className="text-gray-500 text-sm mt-1">{enrolments.length} enrolment{enrolments.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/courses" className="inline-flex items-center gap-2 text-sm font-semibold text-accent no-underline hover:underline">
          Browse more <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {enrolments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-primary/40" />
          </div>
          <h2 className="text-lg font-bold text-primary mb-2">No courses yet</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">Browse our healthcare courses and enrol today.</p>
          <Link href="/courses" className="btn-primary no-underline inline-flex items-center gap-2">
            Browse courses <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {enrolments.map((enr) => {
            const total = enr.course.blocks.reduce((s, b) => s + b._count.lessons, 0);
            const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
            const access = canAccess(enr.status);
            return (
              <div key={enr.id} className="bg-white rounded-2xl border border-border overflow-hidden flex flex-col hover:shadow-card-hover transition-shadow duration-200">
                {/* Thumbnail */}
                <div className="relative h-40 bg-primary/10 flex-shrink-0">
                  {enr.course.thumbnailUrl
                    ? <Image src={enr.course.thumbnailUrl} alt={enr.course.title} fill className="object-cover" sizes="(min-width:640px) 50vw,100vw" />
                    : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-10 h-10 text-primary/20" /></div>}
                  <div className="absolute top-3 right-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[enr.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABEL[enr.status] ?? enr.status}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <h2 className="font-bold text-primary leading-snug mb-1">{enr.course.title}</h2>

                  {enr.course.accreditationText && (
                    <p className="text-xs text-success flex items-center gap-1 mb-3">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      {enr.course.accreditationText}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                    <span>{total} lessons</span>
                    {enr.course.durationWeeks && <span>· {enr.course.durationWeeks} weeks</span>}
                  </div>

                  {/* Progress bar */}
                  {total > 0 && access && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                        <span>Progress</span>
                        <span className="font-semibold text-primary">{pct}%</span>
                      </div>
                      <div className="h-2 bg-surface rounded-full overflow-hidden">
                        <div className="h-full bg-success rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="mt-auto">
                    {access ? (
                      <Link href={`/dashboard/courses/${enr.course.slug}`}
                        className="btn-primary w-full no-underline text-center text-sm flex items-center justify-center gap-2">
                        Continue learning <ArrowRight className="w-4 h-4" />
                      </Link>
                    ) : enr.status === "PENDING_PAYMENT" ? (
                      <Link href="/dashboard/payments"
                        className="btn-outline w-full no-underline text-center text-sm">
                        Complete payment
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
