import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Image from "next/image";
import Link from "next/link";
import { getInitials } from "@/lib/utils/initials";
export const dynamic = "force-dynamic";

export const metadata = { title: "Class Roster - Admin" };

export default async function ClassRosterPage({
  params,
}: {
  params: { intakeId: string };
}) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/403");

  const intake = await db.intake.findUnique({
    where: { id: params.intakeId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          courseCode: true,
        },
      },
      enrolments: {
        include: {
          user: {
            select: {
              id: true,
              registrationNumber: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          user: {
            registrationNumber: "asc",
          },
        },
      },
    },
  });

  if (!intake) notFound();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/classes"
          className="text-sm text-accent hover:underline mb-2 inline-block"
        >
          ← Back to Classes
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{intake.label}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {intake.course.courseCode} - {intake.course.title}
            </p>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span>
                {new Date(intake.startDate).toLocaleDateString("en-UG")} -{" "}
                {new Date(intake.endDate).toLocaleDateString("en-UG")}
              </span>
              <span>{intake.enrolments.length} / {intake.seats} enrolled</span>
              {intake.isOpen ? (
                <span className="text-green-600">Open</span>
              ) : (
                <span className="text-red-600">Closed</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/admin/classes/${intake.id}/export`}
              className="btn btn-sm btn-primary"
            >
              Export List
            </Link>
          </div>
        </div>
      </div>

      {intake.enrolments.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">👥</p>
          <p className="text-gray-500 text-sm">No students enrolled in this class yet.</p>
          <Link
            href={`/admin/classes/${intake.id}/allocate`}
            className="btn btn-sm btn-primary mt-4"
          >
            Allocate Students
          </Link>
        </div>
      ) : (
        <>
          {/* Grid view with photos */}
          <div className="card mb-6">
            <h2 className="font-semibold mb-4">Class Roster ({intake.enrolments.length} students)</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {intake.enrolments.map((enrolment) => {
                const student = enrolment.user;
                const initials = getInitials(student.name);

                return (
                  <Link
                    key={enrolment.id}
                    href={`/admin/students/${student.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
                      {student.avatarUrl ? (
                        <Image
                          src={student.avatarUrl}
                          alt={student.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-gray-400">
                          {initials}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{student.name}</p>
                      <p className="text-xs text-gray-500 font-mono">
                        {student.registrationNumber || "N/A"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Table view */}
          <div className="card">
            <h2 className="font-semibold mb-4">Student List</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-border">
                    <th className="pb-2 font-medium pr-4">Reg. Number</th>
                    <th className="pb-2 font-medium pr-4">Name</th>
                    <th className="pb-2 font-medium pr-4">Email</th>
                    <th className="pb-2 font-medium pr-4">Phone</th>
                    <th className="pb-2 font-medium pr-4">Status</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {intake.enrolments.map((enrolment) => {
                    const student = enrolment.user;

                    return (
                      <tr key={enrolment.id}>
                        <td className="py-2 pr-4 font-mono text-xs">
                          {student.registrationNumber || "N/A"}
                        </td>
                        <td className="py-2 pr-4 font-medium">{student.name}</td>
                        <td className="py-2 pr-4 text-gray-500">{student.email}</td>
                        <td className="py-2 pr-4 text-gray-500">{student.phone || "N/A"}</td>
                        <td className="py-2 pr-4">
                          {enrolment.status === "ACTIVE" ? (
                            <span className="badge badge-success text-xs">Active</span>
                          ) : enrolment.status === "PENDING_PAYMENT" ? (
                            <span className="badge badge-warning text-xs">Pending Payment</span>
                          ) : (
                            <span className="badge badge-danger text-xs">{enrolment.status}</span>
                          )}
                        </td>
                        <td className="py-2">
                          <Link
                            href={`/admin/students/${student.id}`}
                            className="text-xs text-accent hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
