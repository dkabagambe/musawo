import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Student Detail - Principal" };

interface Props {
  params: { id: string };
}

export default async function StudentDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/login");

  const student = await db.user.findUnique({
    where: { id: params.id, role: "STUDENT" },
    include: {
      enrolments: {
        include: {
          course: { select: { title: true, courseCode: true } },
          intake: { select: { label: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      attendance: {
        include: {
          liveClass: { select: { title: true, scheduledAt: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      examAttempts: {
        include: {
          exam: { select: { title: true } },
        },
        orderBy: { startedAt: "desc" },
        take: 10,
      },
      certificates: {
        include: {
          course: { select: { title: true } },
        },
        orderBy: { issuedAt: "desc" },
      },
    },
  });

  if (!student) notFound();

  const STATUS_BADGE: Record<string, string> = {
    ACTIVE: "badge-success",
    SUSPENDED: "badge-danger",
    PENDING_VERIFICATION: "badge-warning",
    PENDING_ACCEPTANCE: "badge-info",
    DETAILS_DISPUTED: "badge-danger",
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/principal/students"
        className="inline-flex items-center gap-1 text-sm text-primary hover:text-accent no-underline mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to students
      </Link>

      <div className="card mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{student.name}</h1>
            <p className="text-sm text-gray-500">
              {student.studentNumber ?? "No student number"}
            </p>
          </div>
          <span className={`badge ${STATUS_BADGE[student.status] ?? "badge-info"}`}>
            {student.status.replace(/_/g, " ")}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Email</p>
            <p className="font-medium">{student.email ?? "-"}</p>
          </div>
          <div>
            <p className="text-gray-500">Phone</p>
            <p className="font-medium">{student.phone ?? "-"}</p>
          </div>
          <div>
            <p className="text-gray-500">Date of Birth</p>
            <p className="font-medium">
              {student.dateOfBirth
                ? new Date(student.dateOfBirth).toLocaleDateString()
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Gender</p>
            <p className="font-medium">{student.gender ?? "-"}</p>
          </div>
          <div>
            <p className="text-gray-500">District</p>
            <p className="font-medium">{student.district ?? "-"}</p>
          </div>
          <div>
            <p className="text-gray-500">Emergency Contact</p>
            <p className="font-medium">{student.emergencyContact ?? "-"}</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Link
            href={`/principal/students/${student.id}/edit`}
            className="btn-primary text-sm no-underline"
          >
            Edit
          </Link>
          {student.status !== "SUSPENDED" ? (
            <button className="btn-outline text-sm" type="button">
              Archive
            </button>
          ) : (
            <button className="btn-outline text-sm" type="button">
              Restore
            </button>
          )}
        </div>
      </div>

      {/* Enrolments */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4">Enrolments</h2>
        {student.enrolments.length === 0 ? (
          <p className="text-sm text-gray-400">No enrolments</p>
        ) : (
          <div className="space-y-3">
            {student.enrolments.map((e) => (
              <div key={e.id} className="border-b border-border pb-3 last:border-0">
                <p className="font-medium text-sm">
                  {e.course.title} ({e.course.courseCode})
                </p>
                <p className="text-xs text-gray-500">
                  Status: {e.status.replace(/_/g, " ")} • Paid: {e.paidPercent}%
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attendance */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4">Recent Attendance</h2>
        {student.attendance.length === 0 ? (
          <p className="text-sm text-gray-400">No attendance records</p>
        ) : (
          <div className="space-y-2">
            {student.attendance.map((a) => (
              <div key={a.id} className="text-sm flex justify-between">
                <span>{a.liveClass?.title ?? "Class"}</span>
                <span className="text-gray-500">
                  {a.mark ?? "Not marked"} •{" "}
                  {new Date(a.liveClass?.scheduledAt ?? a.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exams */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4">Recent Exam Attempts</h2>
        {student.examAttempts.length === 0 ? (
          <p className="text-sm text-gray-400">No exam attempts</p>
        ) : (
          <div className="space-y-2">
            {student.examAttempts.map((a) => (
              <div key={a.id} className="text-sm flex justify-between">
                <span>{a.exam?.title ?? "Exam"}</span>
                <span className="text-gray-500">
                  Score: {a.score ?? "Pending"} • Status: {a.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Certificates */}
      <div className="card">
        <h2 className="text-lg font-bold mb-4">Certificates</h2>
        {student.certificates.length === 0 ? (
          <p className="text-sm text-gray-400">No certificates issued</p>
        ) : (
          <div className="space-y-3">
            {student.certificates.map((c) => (
              <div key={c.id} className="border-b border-border pb-3 last:border-0">
                <p className="font-medium text-sm">{c.course.title}</p>
                <p className="text-xs text-gray-500">
                  Issued: {c.issuedAt ? new Date(c.issuedAt).toLocaleDateString() : "Pending"} •
                  Number: {c.certificateNumber ?? "Pending"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
