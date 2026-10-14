import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ClipboardList, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export const metadata = { title: "Exams — Tutor" };

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
        include: { user: { select: { name: true, studentNumber: true } } },
        orderBy: { submittedAt: "asc" },
      },
    },
  });

  const totalPending = exams.reduce((s, e) => s + e.attempts.length, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Exams</h1>
        <p className="text-gray-500 text-sm mt-1">
          {totalPending > 0 ? `${totalPending} submission${totalPending !== 1 ? "s" : ""} awaiting review` : "All submissions reviewed"}
        </p>
      </div>

      {exams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-7 h-7 text-primary/40" />
          </div>
          <p className="text-gray-500 text-sm">No exams for your courses yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => (
            <div key={exam.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${exam.attempts.length > 0 ? "border-warning/40" : "border-border"}`}>
              {exam.attempts.length > 0 && <div className="h-1 bg-warning" />}
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="font-bold text-primary">{exam.title}</h2>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${exam.status === "PUBLISHED" ? "bg-success/10 text-success" : "bg-warning/10 text-amber-700"}`}>
                        {exam.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{exam.course.title}</p>
                  </div>
                  {exam.attempts.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-warning/10 text-amber-700 text-sm font-bold px-3 py-1.5 rounded-xl flex-shrink-0">
                      <AlertCircle className="w-4 h-4" />
                      {exam.attempts.length} pending
                    </div>
                  )}
                </div>

                {/* Exam meta */}
                <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-4 pb-4 border-b border-border">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{exam.timeLimitMin ?? "No"} min limit</span>
                  <span>{exam.attemptLimit} attempts allowed</span>
                  <span><CheckCircle2 className="w-3.5 h-3.5 inline mr-0.5 text-success" />Pass: {exam.passPercent}%</span>
                  <span>{exam._count.attempts} total submissions</span>
                </div>

                {/* Pending reviews */}
                {exam.attempts.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Awaiting Review</p>
                    <div className="space-y-2">
                      {exam.attempts.map((att) => (
                        <div key={att.id} className="flex items-center gap-3 p-3 bg-warning/5 rounded-xl border border-warning/20">
                          <div className="w-8 h-8 bg-warning/15 rounded-lg flex items-center justify-center text-amber-700 text-xs font-bold flex-shrink-0">
                            {att.user.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-primary">{att.user.name}</p>
                            <p className="text-xs text-gray-400">
                              {att.user.studentNumber ?? ""} · Submitted {att.submittedAt ? new Date(att.submittedAt).toLocaleDateString("en-UG") : "—"}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-amber-700 bg-warning/10 px-2.5 py-1 rounded-full flex-shrink-0">
                            Review
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {exam.attempts.length === 0 && (
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" /> All submissions reviewed
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
