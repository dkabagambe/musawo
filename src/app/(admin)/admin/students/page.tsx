import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";
import { Plus, Download, Upload } from "lucide-react";
import StudentFilters from "./StudentFilters";

export const metadata = { title: "Students - Admin" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: {
    search?: string;
    course?: string;
    intake?: string;
    status?: string;
    page?: string;
  };
}

export default async function AdminStudentsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view"))
    redirect("/403");

  const search = searchParams.search ?? "";
  const courseFilter = searchParams.course ?? "";
  const intakeFilter = searchParams.intake ?? "";
  const statusFilter = searchParams.status ?? "";
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 30;
  const skip = (page - 1) * take;

  // Build where clause
  const where: any = { role: "STUDENT" };
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { studentNumber: { contains: search, mode: "insensitive" } },
    ];
  }
  
  if (statusFilter) {
    where.status = statusFilter;
  }

  // Handle course and intake filters via enrolments
  if (courseFilter || intakeFilter) {
    where.enrolments = {
      some: {
        ...(courseFilter ? { courseId: courseFilter } : {}),
        ...(intakeFilter ? { intakeId: intakeFilter } : {}),
      },
    };
  }

  const [students, total, courses, intakes] = await Promise.all([
    db.user.findMany({
      where,
      include: {
        enrolments: {
          take: 1,
          include: {
            course: { select: { title: true, courseCode: true } },
            intake: { select: { label: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    db.user.count({ where }),
    db.course.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, courseCode: true },
      orderBy: { title: "asc" },
    }),
    db.intake.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, label: true },
      orderBy: { startDate: "desc" },
    }),
  ]);

  const totalPages = Math.ceil(total / take);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Students</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} student{total !== 1 ? "s" : ""} registered
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/admin/students/import"
            className="btn-outline text-sm px-4 py-2 no-underline inline-flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </Link>
          <Link
            href="/admin/students/create"
            className="btn-primary text-sm px-4 py-2 no-underline inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Register Student
          </Link>
        </div>
      </div>

      {/* Filters */}
      <StudentFilters
        courses={courses}
        intakes={intakes}
        currentSearch={search}
        currentCourse={courseFilter}
        currentIntake={intakeFilter}
        currentStatus={statusFilter}
      />

      {/* Students list */}
      {students.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3" aria-hidden="true">📚</p>
          <p className="text-gray-500 text-sm">
            {search || courseFilter || intakeFilter || statusFilter
              ? "No students match your filters."
              : "No students found."}
          </p>
          {(search || courseFilter || intakeFilter || statusFilter) && (
            <Link
              href="/admin/students"
              className="btn-outline text-sm mt-4 inline-block"
            >
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-gray-500">
                <th className="p-3">Name</th>
                <th className="p-3">Registration No.</th>
                <th className="p-3">Email</th>
                <th className="p-3">Course</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((student) => {
                const enrolment = student.enrolments[0];
                return (
                  <tr key={student.id} className="hover:bg-surface transition-colors">
                    <td className="p-3">
                      <Link
                        href={`/admin/students/${student.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {student.name}
                      </Link>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {student.studentNumber || "Pending"}
                    </td>
                    <td className="p-3 text-gray-600">{student.email}</td>
                    <td className="p-3 text-xs">
                      {enrolment
                        ? `${enrolment.course.courseCode} - ${enrolment.intake.label}`
                        : "N/A"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`badge text-xs ${
                          student.status === "ACTIVE"
                            ? "badge-success"
                            : student.status === "PENDING"
                            ? "badge-warning"
                            : student.status === "INVITED"
                            ? "badge-info"
                            : "badge-danger"
                        }`}
                      >
                        {student.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/admin/students/${student.id}`}
                        className="text-primary hover:underline text-xs"
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
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-400">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/students?${new URLSearchParams({
                  ...(search ? { search } : {}),
                  ...(courseFilter ? { course: courseFilter } : {}),
                  ...(intakeFilter ? { intake: intakeFilter } : {}),
                  ...(statusFilter ? { status: statusFilter } : {}),
                  page: (page - 1).toString(),
                }).toString()}`}
                className="btn-outline text-xs px-3 py-1.5 no-underline"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/students?${new URLSearchParams({
                  ...(search ? { search } : {}),
                  ...(courseFilter ? { course: courseFilter } : {}),
                  ...(intakeFilter ? { intake: intakeFilter } : {}),
                  ...(statusFilter ? { status: statusFilter } : {}),
                  page: (page + 1).toString(),
                }).toString()}`}
                className="btn-primary text-xs px-3 py-1.5 no-underline"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
