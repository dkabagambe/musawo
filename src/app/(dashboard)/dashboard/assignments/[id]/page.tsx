import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AssignmentSubmitForm from "./AssignmentSubmitForm";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props) {
  const assignment = await db.assignment.findUnique({
    where: { id: params.id },
    select: { title: true },
  });
  return { title: assignment ? `${assignment.title} - Submit` : "Submit Assignment" };
}

export default async function AssignmentSubmitPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const assignment = await db.assignment.findUnique({
    where: { id: params.id, status: "PUBLISHED" },
    include: {
      course: { select: { title: true } },
    },
  });

  if (!assignment) notFound();

  // Verify the student is enrolled with appropriate payment level
  const enrolment = await db.enrolment.findFirst({
    where: {
      userId:   session.user.id,
      courseId: assignment.courseId,
    },
    select: {
      id: true,
      status: true,
      paidPercent: true,
      provisionalUntil: true,
      graceUntil: true,
      overdueSince: true,
    },
  });
  if (!enrolment) redirect("/403");

  // Check payment level - assignments typically require at least 50% paid
  const { getAccessLevel } = await import("@/lib/enrolment/access");
  const accessLevel = getAccessLevel({
    status: enrolment.status,
    paidPercent: enrolment.paidPercent,
    provisionalUntil: enrolment.provisionalUntil,
    graceUntil: enrolment.graceUntil,
    overdueSince: enrolment.overdueSince,
  });

  // Allow PARTIAL (50%+), FULL, OVERDUE (in grace), and COMPLETED
  const canAccess = ["PARTIAL", "FULL", "OVERDUE", "COMPLETED"].includes(accessLevel);
  if (!canAccess) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center py-10">
          <p className="text-4xl mb-4" aria-hidden="true">🔒</p>
          <h1 className="text-xl font-bold mb-2">Assignment locked</h1>
          <p className="text-sm text-gray-500 mb-4">
            Pay at least 50% of your fees to access assignments. You have paid {enrolment.paidPercent}%.
          </p>
          <a href="/dashboard/payments/claim" className="btn-primary no-underline">
            Pay now
          </a>
        </div>
      </div>
    );
  }

  // Load any existing submission
  const existingSubmission = await db.assignmentSubmission.findUnique({
    where: {
      assignmentId_userId: { assignmentId: assignment.id, userId: session.user.id },
    },
    select: { textBody: true, status: true, grade: true, feedback: true },
  });

  const isPastDeadline = assignment.dueDate && assignment.dueDate < new Date();

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/dashboard/assignments"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-6 no-underline"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to assignments
      </Link>

      {/* Assignment details */}
      <div className="mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
          {assignment.course.title}
        </p>
        <h1 className="text-2xl font-bold text-primary mb-2">{assignment.title}</h1>

        {assignment.dueDate && (
          <p className={`text-sm mb-3 ${isPastDeadline ? "text-danger font-medium" : "text-gray-500"}`}>
            {isPastDeadline ? "⚠️ Deadline passed: " : "Due: "}
            {new Date(assignment.dueDate).toLocaleString("en-UG")}
          </p>
        )}

        {assignment.instructions && (
          <div className="card bg-surface/60 p-4 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Instructions</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{assignment.instructions}</p>
          </div>
        )}

        <p className="text-xs text-gray-400">
          Max score: <span className="font-semibold">{assignment.maxPoints} points</span>
        </p>
      </div>

      {/* Grade & feedback (if already graded) */}
      {existingSubmission?.grade != null && (
        <div className="card bg-success/5 border-success/30 mb-6">
          <p className="text-sm font-semibold text-green-800 mb-1">
            Graded: {existingSubmission.grade} / {assignment.maxPoints}
          </p>
          {existingSubmission.feedback && (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {existingSubmission.feedback}
            </p>
          )}
        </div>
      )}

      {isPastDeadline && !existingSubmission ? (
        <div className="card text-center py-10">
          <p className="text-3xl mb-3" aria-hidden="true">⏰</p>
          <p className="text-gray-700 font-medium">The deadline for this assignment has passed.</p>
          <p className="text-sm text-gray-500 mt-1">Submissions are no longer accepted.</p>
        </div>
      ) : (
        <AssignmentSubmitForm
          assignmentId={assignment.id}
          existingSubmission={existingSubmission}
        />
      )}
    </div>
  );
}
