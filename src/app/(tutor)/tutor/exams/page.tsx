import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const metadata = { title: "Exams - Tutor" };

export default async function TutorExamsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const exams = await db.exam.findMany({
    where: { course: { tutorId: session.user.id } },
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { title: true } },
      _count: { select: { attempts: true } },
      attempts: {
        where: { status: "SUBMITTED" },
        select: { id: true },
      },
    },
  });

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl mb-6">Exams</h1>

      {exams.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-gray-500 text-sm">No exams yet for your courses.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => (
            <div key={exam.id} className="card flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-semibold">{exam.title}</h2>
                  <span className={`badge text-xs ${exam.status === "PUBLISHED" ? "badge-success" : "badge-warning"}`}>
                    {exam.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2">{exam.course.title}</p>
                <div className="flex gap-4 text-xs text-gray-400">
                  <span>⏱ {exam.timeLimitMin ?? "No"} min limit</span>
                  <span>🔁 {exam.attemptLimit} attempts</span>
                  <span>✅ Pass: {exam.passPercent}%</span>
                  <span>📊 {exam._count.attempts} attempts total</span>
                </div>
              </div>
              {exam.attempts.length > 0 && (
                <div className="text-right flex-shrink-0">
                  <span className="badge badge-warning text-sm font-bold">
                    {exam.attempts.length} pending review
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
