import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Student Detail - Admin" };
export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export default async function AdminStudentDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view"))
    redirect("/403");

  const student = await db.user.findUnique({
    where: { id: params.id, role: "STUDENT" },
    include: {
      enrolments: {
        include: {
          course: { select: { title: true, courseCode: true } },
          intake: { select: { label: true } },
        },
      },
    },
  });

  if (!student) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card text-center py-16">
          <p className="text-3xl mb-3" aria-hidden="true">
            🔍
          </p>
          <p className="text-gray-500 text-sm">Student not found.</p>
          <Link href="/admin/students" className="btn-primary text-sm mt-4 inline-block">
            Back to students
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-3 no-underline transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to students
        </Link>
        <h1 className="text-2xl font-bold text-primary">{student.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {student.studentNumber || "Registration pending"}
        </p>
      </div>

      <div className="card">
        <h2 className="font-semibold text-lg mb-4">Profile Information</h2>
        <dl className="space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-gray-500">Email:</dt>
            <dd className="col-span-2">{student.email}</dd>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-gray-500">Phone:</dt>
            <dd className="col-span-2">{student.phone || "N/A"}</dd>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-gray-500">Status:</dt>
            <dd className="col-span-2">
              <span
                className={`badge ${
                  student.status === "ACTIVE"
                    ? "badge-success"
                    : student.status === "PENDING"
                    ? "badge-warning"
                    : "badge-danger"
                }`}
              >
                {student.status}
              </span>
            </dd>
          </div>
          {student.dateOfBirth && (
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-gray-500">Date of Birth:</dt>
              <dd className="col-span-2">
                {new Date(student.dateOfBirth).toLocaleDateString("en-UG")}
              </dd>
            </div>
          )}
          {student.gender && (
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-gray-500">Gender:</dt>
              <dd className="col-span-2">{student.gender}</dd>
            </div>
          )}
          {student.district && (
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-gray-500">District:</dt>
              <dd className="col-span-2">{student.district}</dd>
            </div>
          )}
          {student.highestQualification && (
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-gray-500">Highest Qualification:</dt>
              <dd className="col-span-2">{student.highestQualification}</dd>
            </div>
          )}
          {student.emergencyContact && (
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-gray-500">Emergency Contact:</dt>
              <dd className="col-span-2">{student.emergencyContact}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="card">
        <h2 className="font-semibold text-lg mb-4">Enrolments</h2>
        {student.enrolments.length === 0 ? (
          <p className="text-sm text-gray-500">No enrolments found.</p>
        ) : (
          <div className="space-y-3">
            {student.enrolments.map((enrolment) => (
              <div key={enrolment.id} className="border border-border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {enrolment.course.title} ({enrolment.course.courseCode})
                    </p>
                    <p className="text-xs text-gray-500">
                      {enrolment.intake.label} &middot; Enrolled{" "}
                      {new Date(enrolment.enrolmentDate).toLocaleDateString("en-UG")}
                    </p>
                  </div>
                  <span
                    className={`badge text-xs ${
                      enrolment.status === "ACTIVE"
                        ? "badge-success"
                        : enrolment.status === "PENDING"
                        ? "badge-warning"
                        : enrolment.status === "COMPLETED"
                        ? "badge-info"
                        : "badge-danger"
                    }`}
                  >
                    {enrolment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="font-semibold text-lg mb-4">Account Metadata</h2>
        <dl className="space-y-2 text-xs text-gray-500">
          <div className="grid grid-cols-3 gap-2">
            <dt>Created:</dt>
            <dd className="col-span-2">
              {new Date(student.createdAt).toLocaleString("en-UG")}
            </dd>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <dt>Last Updated:</dt>
            <dd className="col-span-2">
              {new Date(student.updatedAt).toLocaleString("en-UG")}
            </dd>
          </div>
          {student.emailVerified && (
            <div className="grid grid-cols-3 gap-2">
              <dt>Email Verified:</dt>
              <dd className="col-span-2">
                {new Date(student.emailVerified).toLocaleString("en-UG")}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
