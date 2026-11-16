import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Students - Director" };

interface Props {
  searchParams: {
    q?: string;
    course?: string;
    intake?: string;
    status?: string;
    phase?: string;
    page?: string;
  };
}

export default async function DirectorStudentsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/login");

  const q      = searchParams.q?.trim() ?? "";
  const course = searchParams.course ?? "";
  const intake = searchParams.intake ?? "";
  const status = searchParams.status ?? "";
  const phase  = searchParams.phase ?? "";
  const page   = Math.max(1, Number(searchParams.page ?? 1));
  const take   = 40;
  const skip   = (page - 1) * take;

  // Enrolment-status filter mapped to EnrolmentStatus values
  const PHASE_MAP: Record<string, string[]> = {
    pending: ["PENDING_PAYMENT"],
    partial: ["PARTIALLY_PAID"],
    active:  ["ACTIVE"],
    overdue: ["OVERDUE"],
    done:    ["COMPLETED"],
  };
  const phaseStatuses = phase ? PHASE_MAP[phase] ?? [] : [];

  // Build user-level where
  const userWhere: Record<string, unknown> = { role: "STUDENT" };
  if (q) {
    userWhere.OR = [
      { name:          { contains: q, mode: "insensitive" } },
      { email:         { contains: q, mode: "insensitive" } },
      { studentNumber: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status) userWhere.status = status;

  // If filtering by course/intake/phase we filter through enrolments
  const enrolmentWhere: Record<string, unknown> = {};
  if (course) enrolmentWhere.courseId = course;
  if (intake) enrolmentWhere.intakeId = intake;
  if (phaseStatuses.length) enrolmentWhere.status = { in: phaseStatuses };
  const hasEnrolmentFilter = Object.keys(enrolmentWhere).length > 0;

  if (hasEnrolmentFilter) {
    const userIds = await db.enrolment
      .findMany({ where: enrolmentWhere, select: { userId: true }, distinct: ["userId"] })
      .then((rows) => rows.map((r) => r.userId));
    userWhere.id = { in: userIds };
  }

  const [students, total, allCourses, allIntakes, activeCount, completedCount] = await Promise.all([
    db.user.findMany({
      where:   userWhere,
      orderBy: { name: "asc" },
      take,
      skip,
      select: {
        id: true, name: true, email: true, studentNumber: true,
        status: true, createdAt: true,
        enrolments: {
          select: {
            status: true,
            paidPercent: true,
            course:  { select: { title: true } },
            intake:  { select: { label: true } },
          },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    db.user.count({ where: userWhere }),
    db.course.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    db.intake.findMany({ select: { id: true, label: true, courseId: true }, orderBy: { startDate: "desc" } }),
    db.enrolment.count({ where: { status: "ACTIVE" } }),
    db.enrolment.count({ where: { status: "COMPLETED" } }),
  ]);

  const totalPages = Math.ceil(total / take);

  const STATUS_STYLE: Record<string, string> = {
    ACTIVE:               "badge-success",
    INACTIVE:             "badge-danger",
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
    CANCELLED:       "badge-danger",
    REFUNDED:        "badge-info",
  };
  const ENROL_LABEL: Record<string, string> = {
    ACTIVE:          "Active",
    COMPLETED:       "Completed",
    PARTIALLY_PAID:  "Partial payment",
    OVERDUE:         "Overdue",
    PENDING_PAYMENT: "Pending payment",
    SUSPENDED:       "Suspended",
    CANCELLED:       "Cancelled",
    REFUNDED:        "Refunded",
  };

  // Build query string helper (preserves existing filters)
  function qs(overrides: Record<string, string | number>) {
    const params = new URLSearchParams();
    if (q)        params.set("q",      q);
    if (course)   params.set("course", course);
    if (intake)   params.set("intake", intake);
    if (status)   params.set("status", status);
    if (phase)    params.set("phase",  phase);
    for (const [k, v] of Object.entries(overrides)) {
      if (String(v)) params.set(k, String(v));
      else params.delete(k);
    }
    return `/director/students?${params.toString()}`;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total.toLocaleString()} registered &middot; {activeCount.toLocaleString()} active enrolments &middot; {completedCount.toLocaleString()} completed
          </p>
        </div>
        <a
          href={`/api/director/export/students?${new URLSearchParams({ q, course, intake, status, phase }).toString()}`}
          className="btn-secondary text-xs no-underline"
        >
          Export CSV
        </a>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 items-end">
        <input
          name="q"
          defaultValue={q}
          placeholder="Name, email or student no."
          className="input text-sm max-w-xs"
        />
        <select name="course" defaultValue={course} className="input text-sm max-w-xs">
          <option value="">All courses</option>
          {allCourses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <select name="intake" defaultValue={intake} className="input text-sm max-w-xs">
          <option value="">All intakes</option>
          {allIntakes.map((i) => (
            <option key={i.id} value={i.id}>{i.label}</option>
          ))}
        </select>
        <select name="status" defaultValue={status} className="input text-sm">
          <option value="">All account statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="PENDING_VERIFICATION">Pending verification</option>
          <option value="PENDING_ACCEPTANCE">Pending acceptance</option>
          <option value="DETAILS_DISPUTED">Details disputed</option>
        </select>
        <select name="phase" defaultValue={phase} className="input text-sm">
          <option value="">All payment phases</option>
          <option value="pending">Pending payment</option>
          <option value="partial">Partial payment</option>
          <option value="active">Fully active</option>
          <option value="overdue">Overdue</option>
          <option value="done">Completed</option>
        </select>
        <button type="submit" className="btn-secondary text-sm">Filter</button>
        {(q || course || intake || status || phase) && (
          <Link href="/director/students" className="btn-ghost text-sm no-underline">
            Clear filters
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="card overflow-x-auto">
        <p className="text-xs text-gray-400 mb-3">
          {total.toLocaleString()} student{total !== 1 ? "s" : ""}
          {q ? ` matching "${q}"` : ""}
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Name</th>
              <th className="pb-2 font-medium pr-4">Student No.</th>
              <th className="pb-2 font-medium pr-4">Programme</th>
              <th className="pb-2 font-medium pr-4">Intake</th>
              <th className="pb-2 font-medium pr-4">Payment</th>
              <th className="pb-2 font-medium pr-4">Account</th>
              <th className="pb-2 font-medium">Registered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.map((s) => {
              const enr = s.enrolments[0];
              return (
                <tr key={s.id} className="hover:bg-surface/40">
                  <td className="py-2.5 pr-4">
                    <Link
                      href={`/director/students/${s.id}`}
                      className="font-medium text-primary hover:underline no-underline"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">
                    {s.studentNumber ?? "-"}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">
                    {enr?.course.title ?? "-"}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">
                    {enr?.intake?.label ?? "-"}
                  </td>
                  <td className="py-2.5 pr-4">
                    {enr ? (
                      <span className={`badge text-xs ${ENROL_STYLE[enr.status] ?? "badge-info"}`}>
                        {ENROL_LABEL[enr.status] ?? enr.status}
                        {enr.paidPercent > 0 && enr.status !== "COMPLETED" && enr.status !== "ACTIVE"
                          ? ` (${enr.paidPercent}%)`
                          : ""}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Not enrolled</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={`badge text-xs ${STATUS_STYLE[s.status] ?? "badge-info"}`}>
                      {s.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-2.5 text-xs text-gray-400">
                    {new Date(s.createdAt).toLocaleDateString("en-UG")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {students.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">No students found.</p>
        )}

        {totalPages > 1 && (
          <div className="flex justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={qs({ page: page - 1 })} className="btn-outline text-xs px-3 py-1.5 no-underline">
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link href={qs({ page: page + 1 })} className="btn-primary text-xs px-3 py-1.5 no-underline">
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
