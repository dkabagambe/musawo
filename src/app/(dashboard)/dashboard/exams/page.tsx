import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
export const dynamic = "force-dynamic";


export const metadata = { title: "Examinations - Student" };

export default async function StudentExamsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Find exams for courses the student is enrolled in
  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] } },
    select: { courseId: true },
  });
  const courseIds = enrolments.map((e) => e.courseId);

  const exams = await db.exam.findMany({
    where: { courseId: { in: courseIds }, status: "PUBLISHED" },
    include: {
      course: { select: { title: true } },
      attempts: {
        where: { userId: session.user.id },
        orderBy: { number: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Examinations</h1>
        <p className="text-sm text-gray-500 mt-0.5">{exams.length} exam{exams.length !== 1 ? "s" : ""} available</p>
      </div>

      {exams.length === 0 ? (
        <div className="card py-16 text-center text-gray-400 text-sm">
          No exams available yet.
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => {
            const latest = exam.attempts[0];
            return (
              <div key={exam.id} className="card flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-primary">{exam.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{exam.course.title}</p>
                </div>
                <div className="text-right shrink-0">
                  {latest ? (
                    <span className={`badge text-xs ${latest.status === "MARKED" ? "badge-success" : "badge-warning"}`}>
                      {latest.status === "MARKED" ? `${latest.score ?? 0}/${latest.maxScore ?? 0}` : latest.status}
                    </span>
                  ) : (
                    <Link href={`/dashboard/exams/${exam.id}`} className="btn-primary text-xs px-3 py-1.5 no-underline">
                      Start
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
