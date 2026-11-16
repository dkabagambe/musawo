import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props { params: { id: string } }

export default async function DirectorCourseDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) redirect("/login");

  const course = await db.course.findUnique({
    where: { id: params.id },
    select: {
      id: true, title: true, courseCode: true, status: true,
      description: true, shortDescription: true,
      durationMonths: true, durationWeeks: true, intakeLabel: true,
      fullFeeUgx: true, instalmentCount: true, accreditationText: true,
      targetAudience: true, category: true,
      createdAt: true, updatedAt: true,
      tutor: { select: { id: true, name: true, email: true } },
      coTutors: {
        select: { tutor: { select: { id: true, name: true } } },
      },
      blocks: {
        orderBy: { order: "asc" },
        select: {
          id: true, order: true, title: true, description: true,
          prerequisiteBlockOrder: true,
          _count: { select: { lessons: true, exams: true, assignments: true } },
        },
      },
      intakes: {
        orderBy: { startDate: "desc" },
        select: {
          id: true, label: true, startDate: true, endDate: true,
          seats: true, isOpen: true,
          _count: { select: { enrolments: true } },
        },
      },
      _count: { select: { enrolments: true, certificates: true } },
    },
  });

  if (!course) notFound();

  // Approval / change history
  const approvalHistory = await db.approvalRequest.findMany({
    where: { courseId: params.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true, type: true, status: true, reason: true,
      createdAt: true, decidedAt: true, decisionNote: true, reviewNote: true,
      initiator: { select: { name: true, role: true } },
      reviewer:  { select: { name: true } },
      decidedBy: { select: { name: true } },
    },
  });

  const pendingOpen = approvalHistory.filter(
    (a) =>
      (a.type === "ACADEMIC_PROGRAMME_CHANGE" || a.type === "COURSE_CHANGE") &&
      (a.status === "SUBMITTED" || a.status === "IN_REVIEW")
  );

  const STATUS_STYLE: Record<string, string> = {
    PUBLISHED: "badge-success",
    DRAFT:     "badge-warning",
    ARCHIVED:  "badge-danger",
  };
  const APPROVAL_STYLE: Record<string, string> = {
    APPROVED:  "badge-success",
    APPLIED:   "badge-success",
    REJECTED:  "badge-danger",
    SUBMITTED: "badge-warning",
    IN_REVIEW: "badge-warning",
    EXPIRED:   "badge-danger",
    DRAFT:     "badge-info",
  };
  const TYPE_LABEL: Record<string, string> = {
    ACADEMIC_PROGRAMME_CHANGE: "Programme change",
    COURSE_CHANGE:             "Course change",
    RESULTS_PUBLICATION:       "Results publication",
    CERTIFICATE_ISSUANCE:      "Certificate issuance",
    PAYMENT_PROOF:             "Payment proof",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/director/courses" className="text-xs text-gray-400 hover:text-primary no-underline">
        &larr; Back to Courses
      </Link>

      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {course.courseCode && (
                <span className="font-mono text-xs text-gray-400 bg-surface px-2 py-0.5 rounded">
                  {course.courseCode}
                </span>
              )}
              <span className={`badge text-xs ${STATUS_STYLE[course.status] ?? "badge-info"}`}>
                {course.status}
              </span>
              {pendingOpen.length > 0 && (
                <span className="badge text-xs badge-warning">
                  {pendingOpen.length} change{pendingOpen.length !== 1 ? "s" : ""} pending
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-primary mt-1">{course.title}</h1>
            {course.shortDescription && (
              <p className="text-sm text-gray-500 mt-1 max-w-prose">{course.shortDescription}</p>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Enrolments",   value: course._count.enrolments },
            { label: "Certificates", value: course._count.certificates },
            { label: "Units",        value: course.blocks.length },
            { label: "Duration",     value: course.durationMonths ? `${course.durationMonths} mo.` : course.durationWeeks ? `${course.durationWeeks} wks` : "-" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl bg-surface p-3 text-center">
              <p className="text-xl font-bold text-primary">{m.value}</p>
              <p className="text-xs text-gray-400">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500">
          <span>Category: {course.category}</span>
          {course.accreditationText && <span>Accreditation: {course.accreditationText}</span>}
          {course.fullFeeUgx && <span>Full fee: UGX {course.fullFeeUgx.toLocaleString()}</span>}
          {course.instalmentCount > 1 && <span>Instalments: {course.instalmentCount}</span>}
          {course.targetAudience && <span>Audience: {course.targetAudience}</span>}
          <span>Last updated: {new Date(course.updatedAt).toLocaleDateString("en-UG")}</span>
        </div>
      </div>

      {/* Instructors */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-sm">Instructors</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/director/instructors/${course.tutor.id}`}
            className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full hover:underline no-underline"
          >
            {course.tutor.name} (Lead)
          </Link>
          {course.coTutors.map((ct) => (
            <Link
              key={ct.tutor.id}
              href={`/director/instructors/${ct.tutor.id}`}
              className="text-xs bg-surface text-gray-500 px-3 py-1.5 rounded-full hover:underline no-underline"
            >
              {ct.tutor.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Intakes */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-sm">Intakes</h2>
        {course.intakes.length === 0 ? (
          <p className="text-xs text-gray-400">No intakes defined.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 text-left border-b border-border">
                <th className="pb-1 pr-4 font-normal">Label</th>
                <th className="pb-1 pr-4 font-normal">Start</th>
                <th className="pb-1 pr-4 font-normal">End</th>
                <th className="pb-1 pr-4 font-normal">Seats</th>
                <th className="pb-1 pr-4 font-normal">Enrolled</th>
                <th className="pb-1 font-normal">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {course.intakes.map((i) => (
                <tr key={i.id}>
                  <td className="py-1.5 pr-4 font-medium">{i.label}</td>
                  <td className="py-1.5 pr-4 text-gray-400">
                    {new Date(i.startDate).toLocaleDateString("en-UG")}
                  </td>
                  <td className="py-1.5 pr-4 text-gray-400">
                    {new Date(i.endDate).toLocaleDateString("en-UG")}
                  </td>
                  <td className="py-1.5 pr-4">{i.seats}</td>
                  <td className="py-1.5 pr-4">{i._count.enrolments}</td>
                  <td className="py-1.5">
                    <span className={`badge text-xs ${i.isOpen ? "badge-success" : "badge-danger"}`}>
                      {i.isOpen ? "Yes" : "Closed"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Course units */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-sm">Course units ({course.blocks.length})</h2>
        {course.blocks.length === 0 ? (
          <p className="text-xs text-gray-400">No units defined yet.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 text-left border-b border-border">
                <th className="pb-1 pr-2 font-normal">#</th>
                <th className="pb-1 pr-4 font-normal">Title</th>
                <th className="pb-1 pr-4 font-normal">Lessons</th>
                <th className="pb-1 pr-4 font-normal">Exams</th>
                <th className="pb-1 pr-4 font-normal">Assignments</th>
                <th className="pb-1 font-normal">Prerequisite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {course.blocks.map((b) => (
                <tr key={b.id}>
                  <td className="py-1.5 pr-2 text-gray-400">{b.order}</td>
                  <td className="py-1.5 pr-4 font-medium">{b.title}</td>
                  <td className="py-1.5 pr-4">{b._count.lessons}</td>
                  <td className="py-1.5 pr-4">{b._count.exams}</td>
                  <td className="py-1.5 pr-4">{b._count.assignments}</td>
                  <td className="py-1.5 text-gray-400">
                    {b.prerequisiteBlockOrder ? `Unit ${b.prerequisiteBlockOrder}` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Approval / change history */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-sm">Approval and change history</h2>
        {approvalHistory.length === 0 ? (
          <p className="text-xs text-gray-400">No approval requests for this course.</p>
        ) : (
          <div className="space-y-3">
            {approvalHistory.map((ar) => (
              <div
                key={ar.id}
                className={`border rounded-xl p-3 ${
                  ar.status === "SUBMITTED" || ar.status === "IN_REVIEW"
                    ? "border-amber-200 bg-amber-50/40"
                    : "border-border"
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-xs">
                    {TYPE_LABEL[ar.type] ?? ar.type.replace(/_/g, " ")}
                  </span>
                  <span className={`badge text-xs ${APPROVAL_STYLE[ar.status] ?? "badge-info"}`}>
                    {ar.status}
                  </span>
                  {(ar.status === "SUBMITTED" || ar.status === "IN_REVIEW") && (
                    <Link
                      href={`/director/approvals/${ar.id}`}
                      className="text-xs text-amber-700 hover:underline no-underline ml-auto"
                    >
                      Review &rarr;
                    </Link>
                  )}
                </div>
                <div className="text-xs text-gray-400 space-y-0.5">
                  <p>
                    Submitted by {ar.initiator.name} ({ar.initiator.role.toLowerCase()}) on{" "}
                    {new Date(ar.createdAt).toLocaleDateString("en-UG")}
                  </p>
                  {ar.reviewer && ar.reviewNote && (
                    <p>Reviewed by {ar.reviewer.name}: {ar.reviewNote}</p>
                  )}
                  {ar.decidedBy && (
                    <p>
                      {ar.status === "APPROVED" || ar.status === "APPLIED" ? "Approved" : "Rejected"} by{" "}
                      {ar.decidedBy.name}
                      {ar.decidedAt ? ` on ${new Date(ar.decidedAt).toLocaleDateString("en-UG")}` : ""}
                    </p>
                  )}
                </div>
                {ar.reason && (
                  <p className="mt-1.5 text-xs text-gray-600 border-l-2 border-primary/30 pl-2">
                    {ar.reason}
                  </p>
                )}
                {ar.decisionNote && (
                  <p className="mt-1 text-xs text-gray-500 italic">
                    Decision note: {ar.decisionNote}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
