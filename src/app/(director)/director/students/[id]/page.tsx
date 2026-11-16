import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props { params: { id: string } }

export default async function DirectorStudentDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/login");

  const student = await db.user.findUnique({
    where: { id: params.id, role: "STUDENT" },
    select: {
      id: true, name: true, email: true, phone: true, studentNumber: true,
      status: true, gender: true, district: true, dateOfBirth: true,
      highestQualification: true, professionalTitle: true, registrationNumber: true,
      createdAt: true, avatarUrl: true,
      enrolments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true, status: true, paidPercent: true, paidAmountUgx: true,
          totalAmountUgx: true, planType: true, createdAt: true,
          course:  { select: { title: true, courseCode: true } },
          intake:  { select: { label: true } },
          payments: {
            where: { status: "COMPLETED" },
            select: { amount: true, method: true, paidAt: true },
            orderBy: { paidAt: "desc" },
          },
        },
      },
      attendance: {
        select: {
          markedPresent: true, startMark: true,
          liveClass: { select: { title: true, scheduledAt: true, course: { select: { title: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      gradeEntries: {
        where: { releasedAt: { not: null } },
        select: {
          itemType: true, itemTitle: true, score: true, maxScore: true,
          percentage: true, passed: true, gradedAt: true,
          course: { select: { title: true } },
        },
        orderBy: { gradedAt: "desc" },
      },
      studentDocuments: {
        where: { deletedAt: null },
        select: { id: true, title: true, type: true, fileName: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!student) notFound();

  // Approval history where this student is the subject
  const approvalHistory = await db.approvalRequest.findMany({
    where: { studentId: params.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true, type: true, status: true, reason: true,
      createdAt: true, decidedAt: true, decisionNote: true,
      initiator: { select: { name: true } },
      decidedBy: { select: { name: true } },
    },
  });

  // Attendance summary
  const totalClasses  = student.attendance.length;
  const attended      = student.attendance.filter((a) => a.markedPresent).length;
  const attendancePct = totalClasses > 0 ? Math.round((attended / totalClasses) * 100) : null;

  const STATUS_STYLE: Record<string, string> = {
    ACTIVE:               "badge-success",
    SUSPENDED:            "badge-danger",
    PENDING_VERIFICATION: "badge-warning",
    PENDING_ACCEPTANCE:   "badge-warning",
    DETAILS_DISPUTED:     "badge-warning",
  };
  const ENROL_STYLE: Record<string, string> = {
    ACTIVE:          "badge-success",
    COMPLETED:       "badge-success",
    PARTIALLY_PAID:  "badge-warning",
    OVERDUE:         "badge-danger",
    PENDING_PAYMENT: "badge-info",
    SUSPENDED:       "badge-danger",
  };
  const APPROVAL_STYLE: Record<string, string> = {
    APPROVED: "badge-success",
    APPLIED:  "badge-success",
    REJECTED: "badge-danger",
    SUBMITTED:"badge-warning",
    IN_REVIEW:"badge-warning",
    EXPIRED:  "badge-danger",
  };
  const TYPE_LABEL: Record<string, string> = {
    PAYMENT_PROOF:       "Payment proof",
    ADMISSION:           "Admission",
    CERTIFICATE_ISSUANCE:"Certificate issuance",
    RESULTS_PUBLICATION: "Results publication",
    REFUND:              "Refund",
    WAIVER:              "Waiver",
    FEE_CHANGE:          "Fee change",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/director/students" className="text-xs text-gray-400 hover:text-primary no-underline">
        &larr; Back to Students
      </Link>

      {/* Profile card */}
      <div className="card">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary flex-shrink-0">
            {student.avatarUrl
              ? <img src={student.avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
              : student.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-primary">{student.name}</h1>
              <span className={`badge text-xs ${STATUS_STYLE[student.status] ?? "badge-info"}`}>
                {student.status.replace(/_/g, " ")}
              </span>
            </div>
            {student.studentNumber && (
              <p className="text-xs font-mono text-gray-400 mt-0.5">{student.studentNumber}</p>
            )}
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500 max-w-sm">
              {student.email  && <span>Email: {student.email}</span>}
              {student.phone  && <span>Phone: {student.phone}</span>}
              {student.gender && <span>Gender: {student.gender}</span>}
              {student.district && <span>District: {student.district}</span>}
              {student.highestQualification && <span>Qualification: {student.highestQualification}</span>}
              {student.professionalTitle && <span>Title: {student.professionalTitle}</span>}
              {student.registrationNumber && <span>Reg. No: {student.registrationNumber}</span>}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Registered {new Date(student.createdAt).toLocaleDateString("en-UG", { timeZone: "Africa/Kampala" })}
            </p>
          </div>
        </div>
      </div>

      {/* Enrolment and payment phase */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-sm">Enrolment and payment</h2>
        {student.enrolments.length === 0 ? (
          <p className="text-xs text-gray-400">Not enrolled in any programme.</p>
        ) : (
          student.enrolments.map((enr) => (
            <div key={enr.id} className="border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{enr.course.title}</span>
                <span className={`badge text-xs ${ENROL_STYLE[enr.status] ?? "badge-info"}`}>
                  {enr.status.replace(/_/g, " ")}
                </span>
              </div>
              {enr.intake && (
                <p className="text-xs text-gray-400">Intake: {enr.intake.label}</p>
              )}
              <div className="flex gap-6 text-xs text-gray-500">
                <span>Paid: UGX {enr.paidAmountUgx.toLocaleString()} / {enr.totalAmountUgx.toLocaleString()} ({enr.paidPercent}%)</span>
                <span>Plan: {enr.planType}</span>
              </div>
              {enr.payments.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-400 mb-1">Payments received</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400 text-left">
                        <th className="pb-1 pr-3 font-normal">Amount</th>
                        <th className="pb-1 pr-3 font-normal">Method</th>
                        <th className="pb-1 font-normal">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {enr.payments.map((p, i) => (
                        <tr key={i}>
                          <td className="py-1 pr-3">UGX {p.amount.toLocaleString()}</td>
                          <td className="py-1 pr-3 capitalize">{p.method.replace(/_/g, " ").toLowerCase()}</td>
                          <td className="py-1 text-gray-400">
                            {p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-UG") : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Attendance summary */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold text-sm">Attendance</h2>
          {attendancePct !== null && (
            <span className={`badge text-xs ${attendancePct >= 75 ? "badge-success" : attendancePct >= 50 ? "badge-warning" : "badge-danger"}`}>
              {attendancePct}% attendance
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">
          {attended} of {totalClasses} classes attended
        </p>
        {student.attendance.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 text-left border-b border-border">
                  <th className="pb-1 pr-4 font-normal">Class</th>
                  <th className="pb-1 pr-4 font-normal">Date</th>
                  <th className="pb-1 font-normal">Mark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {student.attendance.slice(0, 20).map((a, i) => (
                  <tr key={i}>
                    <td className="py-1.5 pr-4">{a.liveClass.title}</td>
                    <td className="py-1.5 pr-4 text-gray-400">
                      {new Date(a.liveClass.scheduledAt).toLocaleDateString("en-UG")}
                    </td>
                    <td className="py-1.5">
                      <span className={`badge text-xs ${
                        a.markedPresent ? "badge-success"
                        : a.startMark === "EXCUSED" ? "badge-info"
                        : a.startMark === "LATE" ? "badge-warning"
                        : "badge-danger"
                      }`}>
                        {a.startMark ?? (a.markedPresent ? "Present" : "Absent")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {student.attendance.length > 20 && (
              <p className="text-xs text-gray-400 mt-2">
                Showing 20 of {student.attendance.length} records.
              </p>
            )}
          </div>
        )}
        {student.attendance.length === 0 && (
          <p className="text-xs text-gray-400">No attendance records.</p>
        )}
      </div>

      {/* Marks / grades (released only) */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-sm">Marks (released)</h2>
        {student.gradeEntries.length === 0 ? (
          <p className="text-xs text-gray-400">No released marks on record.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 text-left border-b border-border">
                <th className="pb-1 pr-4 font-normal">Item</th>
                <th className="pb-1 pr-4 font-normal">Type</th>
                <th className="pb-1 pr-4 font-normal">Score</th>
                <th className="pb-1 pr-4 font-normal">Result</th>
                <th className="pb-1 font-normal">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {student.gradeEntries.map((g, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-4">{g.itemTitle}</td>
                  <td className="py-1.5 pr-4 capitalize text-gray-400">{g.itemType.toLowerCase()}</td>
                  <td className="py-1.5 pr-4">
                    {g.score !== null && g.maxScore
                      ? `${g.score}/${g.maxScore}${g.percentage !== null ? ` (${Math.round(g.percentage)}%)` : ""}`
                      : "-"}
                  </td>
                  <td className="py-1.5 pr-4">
                    <span className={`badge text-xs ${g.passed ? "badge-success" : "badge-danger"}`}>
                      {g.passed ? "Pass" : "Fail"}
                    </span>
                  </td>
                  <td className="py-1.5 text-gray-400">
                    {g.gradedAt ? new Date(g.gradedAt).toLocaleDateString("en-UG") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Documents (view only) */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-sm">Documents</h2>
        {student.studentDocuments.length === 0 ? (
          <p className="text-xs text-gray-400">No documents on file.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 text-left border-b border-border">
                <th className="pb-1 pr-4 font-normal">Title</th>
                <th className="pb-1 pr-4 font-normal">Type</th>
                <th className="pb-1 font-normal">Uploaded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {student.studentDocuments.map((doc) => (
                <tr key={doc.id}>
                  <td className="py-1.5 pr-4">{doc.title}</td>
                  <td className="py-1.5 pr-4 capitalize text-gray-400">
                    {doc.type.replace(/_/g, " ").toLowerCase()}
                  </td>
                  <td className="py-1.5 text-gray-400">
                    {new Date(doc.createdAt).toLocaleDateString("en-UG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Approval history */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-sm">Approval history</h2>
        {approvalHistory.length === 0 ? (
          <p className="text-xs text-gray-400">No approval requests involving this student.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 text-left border-b border-border">
                <th className="pb-1 pr-4 font-normal">Type</th>
                <th className="pb-1 pr-4 font-normal">Status</th>
                <th className="pb-1 pr-4 font-normal">By</th>
                <th className="pb-1 font-normal">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {approvalHistory.map((ar) => (
                <tr key={ar.id}>
                  <td className="py-1.5 pr-4">
                    <Link
                      href={`/director/approvals/${ar.id}`}
                      className="text-primary hover:underline no-underline"
                    >
                      {TYPE_LABEL[ar.type] ?? ar.type.replace(/_/g, " ")}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-4">
                    <span className={`badge text-xs ${APPROVAL_STYLE[ar.status] ?? "badge-info"}`}>
                      {ar.status}
                    </span>
                  </td>
                  <td className="py-1.5 pr-4 text-gray-400">
                    {ar.decidedBy?.name ?? ar.initiator.name}
                  </td>
                  <td className="py-1.5 text-gray-400">
                    {new Date(ar.createdAt).toLocaleDateString("en-UG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
