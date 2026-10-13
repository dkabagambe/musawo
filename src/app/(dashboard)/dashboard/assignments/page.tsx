import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { FileText, Clock, CheckCircle2, AlertCircle, BookOpen } from "lucide-react";

export const metadata = { title: "Assignments — Musawo Training Center" };

export default async function AssignmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrolments = await db.enrolment.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["ACTIVE", "COMPLETED", "PARTIALLY_PAID", "SPONSORED"] },
    },
    select: { courseId: true },
  });
  const courseIds = enrolments.map((e) => e.courseId);

  const assignments = await db.assignment.findMany({
    where: { courseId: { in: courseIds }, status: "PUBLISHED" },
    orderBy: { dueDate: "asc" },
    include: {
      course: { select: { title: true, slug: true } },
      submissions: {
        where: { userId: session.user.id },
        select: { id: true, status: true, grade: true, feedback: true, submittedAt: true },
      },
    },
  });

  const now = new Date();
  const overdue   = assignments.filter((a) => a.dueDate != null && a.dueDate < now && !a.submissions[0]);
  const pending   = assignments.filter((a) => (a.dueDate == null || a.dueDate >= now) && !a.submissions[0]);
  const submitted = assignments.filter((a) => !!a.submissions[0]);

  if (assignments.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-primary mb-2">Assignments</h1>
        <p className="text-gray-500 text-sm mb-8">Written tasks and reflections set by your tutor.</p>
        <div className="card text-center py-14">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
          <p className="font-semibold text-gray-600 mb-1">No assignments yet</p>
          <p className="text-sm text-gray-400">
            Your tutor hasn&apos;t posted any assignments yet. Check back soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-primary mb-2">Assignments</h1>
      <p className="text-gray-500 text-sm mb-8">
        {assignments.length} assignment{assignments.length !== 1 ? "s" : ""} across your courses.
      </p>

      {overdue.length > 0 && (
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-danger uppercase tracking-wider mb-3">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            Overdue ({overdue.length})
          </h2>
          <div className="space-y-3">
            {overdue.map((a) => (
              <AssignmentCard key={a.id} a={a} overdue />
            ))}
          </div>
        </section>
      )}

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            <Clock className="w-4 h-4" aria-hidden="true" />
            To do ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((a) => (
              <AssignmentCard key={a.id} a={a} overdue={false} />
            ))}
          </div>
        </section>
      )}

      {submitted.length > 0 && (
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-success uppercase tracking-wider mb-3">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            Submitted ({submitted.length})
          </h2>
          <div className="space-y-3">
            {submitted.map((a) => (
              <AssignmentCard key={a.id} a={a} overdue={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

type AsgWithRelations = Awaited<
  ReturnType<typeof db.assignment.findMany<{
    include: {
      course: { select: { title: true; slug: true } };
      submissions: { where: { userId: string }; select: { id: true; status: true; grade: true; feedback: true; submittedAt: true } };
    };
  }>>
>[number];

function AssignmentCard({ a, overdue }: { a: AsgWithRelations; overdue: boolean }) {
  const sub = a.submissions[0] ?? null;
  const dueDateStr = a.dueDate
    ? new Date(a.dueDate).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })
    : "No deadline";

  return (
    <div className={`card p-5 ${overdue ? "border-danger/30" : ""}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
            <BookOpen className="w-3 h-3" aria-hidden="true" />
            {a.course.title}
          </p>
          <h3 className="font-semibold text-primary leading-snug">{a.title}</h3>
        </div>
        {sub ? (
          sub.grade != null
            ? <span className="badge badge-success flex-shrink-0">Graded {sub.grade}/{a.maxPoints}</span>
            : <span className="badge badge-info flex-shrink-0">Submitted</span>
        ) : overdue ? (
          <span className="badge badge-danger flex-shrink-0">Overdue</span>
        ) : (
          <span className="badge badge-warning flex-shrink-0">Pending</span>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{a.instructions}</p>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className={`text-xs font-medium flex items-center gap-1 ${overdue ? "text-danger" : "text-gray-400"}`}>
          <Clock className="w-3 h-3" aria-hidden="true" />
          Due {dueDateStr}
        </span>
        <span className="text-xs text-gray-400">{a.maxPoints} pts</span>
      </div>

      {sub?.feedback && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-gray-500 italic">&ldquo;{sub.feedback}&rdquo;</p>
        </div>
      )}

      {!sub && (
        <div className="mt-4">
          <Link
            href={`/dashboard/assignments/${a.id}`}
            className="btn-secondary text-sm no-underline"
          >
            Submit assignment
          </Link>
        </div>
      )}
    </div>
  );
}
