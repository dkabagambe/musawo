import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { can } from "@/lib/rbac";
import Link from "next/link";
import GradeSubmissionsClient from "./GradeSubmissionsClient";
import AssignmentStatusButton from "./AssignmentStatusButton";
export const dynamic = "force-dynamic";

export const metadata = { title: "Grade Assignment - Teaching Portal" };

export default async function TutorAssignmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "exams.mark")) redirect("/403");

  const assignment = await db.assignment.findFirst({
    where: {
      id: params.id,
      course: teachingCourseWhere(session.user.id),
    },
    include: {
      course: { select: { title: true } },
    },
  });

  if (!assignment) notFound();

  const submissions = await db.assignmentSubmission.findMany({
    where: { assignmentId: params.id },
    orderBy: { submittedAt: "asc" },
    include: {
      user: { select: { id: true, name: true, studentNumber: true } },
    },
  });

  const toGrade = submissions.filter((s) => s.status === "SUBMITTED" && s.grade === null).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/tutor/assignments" className="text-sm text-accent no-underline hover:underline mb-3 inline-block">
          &larr; Back to assignments
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-primary">{assignment.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {assignment.course.title} &middot; Max {assignment.maxPoints} pts
              {assignment.dueDate && ` &middot; Due ${new Date(assignment.dueDate).toLocaleDateString("en-UG")}`}
            </p>
          </div>
          <span className={`badge text-sm flex-shrink-0 ${assignment.status === "PUBLISHED" ? "badge-success" : assignment.status === "CLOSED" ? "badge" : "badge-warning"}`}>
            {assignment.status}
          </span>
          <AssignmentStatusButton assignmentId={params.id} currentStatus={assignment.status} />
        </div>
      </div>

      {/* Instructions */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Instructions</h2>
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{assignment.instructions}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-primary">{submissions.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total submissions</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-warning">{toGrade}</p>
          <p className="text-xs text-gray-500 mt-1">Awaiting grades</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-success">{submissions.length - toGrade}</p>
          <p className="text-xs text-gray-500 mt-1">Graded</p>
        </div>
      </div>

      {/* Submissions list */}
      <GradeSubmissionsClient
        assignmentId={params.id}
        maxPoints={assignment.maxPoints}
        dueDate={assignment.dueDate ? assignment.dueDate.toISOString() : null}
        submissions={submissions.map((s) => ({
          id: s.id,
          userId: s.user.id,
          studentName: s.user.name,
          studentNumber: s.user.studentNumber ?? null,
          textBody: s.textBody,
          fileS3Key: s.fileS3Key ?? null,
          submittedAt: s.submittedAt ? s.submittedAt.toISOString() : null,
          grade: s.grade,
          feedback: s.feedback,
          status: s.status,
        }))}
      />
    </div>
  );
}
