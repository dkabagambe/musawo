import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";

export const metadata = { title: "Transcripts - Registrar" };

export default async function RegistrarTranscriptsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "transcripts.generate"))
    redirect("/registrar");

  const completedEnrolments = await db.enrolment.findMany({
    where: { status: "COMPLETED" },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: {
      user: {
        select: { name: true, studentNumber: true, email: true },
      },
      course: { select: { title: true } },
    },
  });

  return (
    <main className="portal-page">
      <div className="portal-page-header">
        <h1 className="portal-page-title">Transcripts</h1>
        <p className="portal-page-subtitle">
          Completed enrolments eligible for official transcript generation.
        </p>
      </div>

      {completedEnrolments.length === 0 ? (
        <p className="portal-empty-state">No completed enrolments yet.</p>
      ) : (
        <div className="portal-list">
          {completedEnrolments.map((e) => (
            <div key={e.id} className="portal-list-item">
              <span className="portal-list-item-title">
                {e.user.name ?? "Unknown"} — {e.user.studentNumber ?? "no SN"}
              </span>
              <span className="portal-list-item-meta">
                {e.course.title} &mdash;{" "}
                {new Date(e.updatedAt).toLocaleDateString("en-GB")}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
