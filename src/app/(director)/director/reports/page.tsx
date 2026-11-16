import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports & Analytics - Director" };

interface Props {
  searchParams: { intake?: string; course?: string; period?: string };
}

export default async function DirectorReportsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "reports.academic")) redirect("/login");

  const intakeFilter = searchParams.intake ?? "";
  const courseFilter = searchParams.course ?? "";
  const period       = searchParams.period ?? "all";
  const periodDays   = period === "30" ? 30 : period === "90" ? 90 : period === "365" ? 365 : null;
  const since        = periodDays ? new Date(Date.now() - periodDays * 86_400_000) : undefined;
  const dateSince    = since ? { gte: since } : undefined;

  // Load filter options
  const [allCourses, allIntakes] = await Promise.all([
    db.course.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    db.intake.findMany({ select: { id: true, label: true, courseId: true }, orderBy: { startDate: "desc" } }),
  ]);

  // Enrolment base filter
  const enrolWhere: Record<string, unknown> = {};
  if (courseFilter) enrolWhere.courseId = courseFilter;
  if (intakeFilter) enrolWhere.intakeId = intakeFilter;
  if (dateSince)    enrolWhere.createdAt = dateSince;

  const [
    // --- Enrolment counts ---
    enrolByStatus,
    // --- Applications funnel ---
    applicationsByStatus,
    // --- Academic performance: pass rates per course ---
    passRatesByCourse,
    // --- Attendance ---
    attendanceTotals,
    // --- Finance summary ---
    financeSummary,
    // --- Certificates ---
    certCount,
    // --- Instructor activity ---
    instructorActivity,
    // --- Global snapshot for header cards ---
    totalActiveStudents,
    totalActiveCourses,
    totalInstructors,
    pendingApprovals,
  ] = await Promise.all([
    // Enrolment by status (optionally filtered)
    db.enrolment.groupBy({
      by:    ["status"],
      where: enrolWhere,
      _count:{ _all: true },
    }),
    // Applications funnel (all time, no intake filter — intake not on Application)
    db.application.groupBy({
      by:    ["status"],
      _count:{ _all: true },
    }),
    // Pass rate per course (released grade entries)
    db.gradeEntry.groupBy({
      by:    ["courseId", "passed"],
      where: { releasedAt: { not: null }, ...(courseFilter ? { courseId: courseFilter } : {}) },
      _count:{ _all: true },
    }),
    // Attendance totals across completed classes
    db.attendance.aggregate({
      where: { liveClass: { status: "COMPLETED" } },
      _count:{ _all: true },
    }),
    // Finance: collected vs total fees
    db.enrolment.aggregate({
      where: { ...enrolWhere },
      _sum: { totalAmountUgx: true, paidAmountUgx: true },
    }),
    // Certificates issued (all time)
    db.certificate.count({ where: { revokedAt: null } }),
    // Instructor activity: classes held per instructor
    db.liveClass.groupBy({
      by:   ["tutorId"],
      where:{ status: "COMPLETED" },
      _count:{ _all: true },
    }).then(r => r.sort((a, b) => b._count._all - a._count._all).slice(0, 8)),
    db.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.user.count({ where: { role: "INSTRUCTOR", status: "ACTIVE" } }),
    db.approvalRequest.count({ where: { status: { in: ["SUBMITTED", "IN_REVIEW"] } } }),
  ]);

  // Enrolment summary
  const enrolMap: Record<string, number> = {};
  for (const e of enrolByStatus) enrolMap[e.status] = e._count._all;
  const totalEnrolled = Object.values(enrolMap).reduce((a, b) => a + b, 0);

  // Applications funnel
  const appMap: Record<string, number> = {};
  for (const a of applicationsByStatus) appMap[a.status] = a._count._all;

  // Pass rates per course
  const passMap: Record<string, { pass: number; fail: number }> = {};
  for (const row of passRatesByCourse) {
    if (!passMap[row.courseId]) passMap[row.courseId] = { pass: 0, fail: 0 };
    if (row.passed === true)  passMap[row.courseId].pass += row._count._all;
    if (row.passed === false) passMap[row.courseId].fail += row._count._all;
  }
  const courseIdsWithGrades = Object.keys(passMap);
  const gradeCourses = courseIdsWithGrades.length
    ? await db.course.findMany({
        where: { id: { in: courseIdsWithGrades } },
        select: { id: true, title: true },
      })
    : [];
  const gradeCourseMap = Object.fromEntries(gradeCourses.map((c) => [c.id, c.title]));

  // Attendance rate
  const totalAttendanceRows = attendanceTotals._count._all;
  const presentCount = await db.attendance.count({
    where: { markedPresent: true, liveClass: { status: "COMPLETED" } },
  });
  const attendanceRate = totalAttendanceRows > 0
    ? Math.round((presentCount / totalAttendanceRows) * 100)
    : null;

  // Finance
  const collected  = financeSummary._sum.paidAmountUgx  ?? 0;
  const totalFees  = financeSummary._sum.totalAmountUgx ?? 0;
  const outstanding = totalFees - collected;

  // Instructor activity names
  const instructorIds = instructorActivity.map((r) => r.tutorId);
  const instructorNames = instructorIds.length
    ? await db.user.findMany({
        where:  { id: { in: instructorIds } },
        select: { id: true, name: true },
      })
    : [];
  const instrNameMap = Object.fromEntries(instructorNames.map((u) => [u.id, u.name]));

  // Enrolments by course (for chart)
  const enrolByCourse = (await db.enrolment.groupBy({
    by:    ["courseId"],
    where: enrolWhere,
    _count:{ _all: true },
  })).sort((a, b) => b._count._all - a._count._all).slice(0, 8);
  const topCourseIds = enrolByCourse.map((e) => e.courseId);
  const topCourses = topCourseIds.length
    ? await db.course.findMany({ where: { id: { in: topCourseIds } }, select: { id: true, title: true } })
    : [];
  const topCourseMap = Object.fromEntries(topCourses.map((c) => [c.id, c.title]));

  const PERIODS = [
    { key: "30",  label: "30 days" },
    { key: "90",  label: "90 days" },
    { key: "365", label: "1 year"  },
    { key: "all", label: "All time"},
  ];

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
  const APP_LABEL: Record<string, string> = {
    SUBMITTED:    "Applied",
    UNDER_REVIEW: "Under review",
    ACCEPTED:     "Admitted",
    REJECTED:     "Rejected",
    WITHDRAWN:    "Withdrawn",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary">Reports and Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Institution-wide. All numbers from live data.</p>
        </div>
        <a
          href={`/api/director/export/reports?intake=${intakeFilter}&course=${courseFilter}&period=${period}`}
          className="btn-secondary text-xs no-underline"
        >
          Export CSV
        </a>
      </div>

      {/* Period + filters */}
      <form method="GET" className="flex flex-wrap gap-3 items-end">
        <div className="flex gap-1 flex-wrap">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/director/reports?period=${p.key}${courseFilter ? `&course=${courseFilter}` : ""}${intakeFilter ? `&intake=${intakeFilter}` : ""}`}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium no-underline transition-colors ${
                period === p.key ? "bg-primary text-white" : "bg-surface text-gray-600 hover:bg-primary/10"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
        <select name="course" defaultValue={courseFilter} className="input text-sm max-w-xs">
          <option value="">All courses</option>
          {allCourses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <select name="intake" defaultValue={intakeFilter} className="input text-sm max-w-xs">
          <option value="">All intakes</option>
          {allIntakes.map((i) => (
            <option key={i.id} value={i.id}>{i.label}</option>
          ))}
        </select>
        <input type="hidden" name="period" value={period} />
        <button type="submit" className="btn-secondary text-sm">Apply</button>
        {(courseFilter || intakeFilter) && (
          <Link href={`/director/reports?period=${period}`} className="btn-ghost text-sm no-underline">Clear</Link>
        )}
      </form>

      {/* Snapshot header cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active students",   value: totalActiveStudents,  href: "/director/students" },
          { label: "Active courses",    value: totalActiveCourses,   href: "/director/courses" },
          { label: "Instructors",       value: totalInstructors,     href: "/director/instructors" },
          { label: "Pending approvals", value: pendingApprovals,     href: "/director/approvals", warn: pendingApprovals > 0 },
        ].map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`card text-center no-underline hover:shadow-md transition-shadow ${s.warn ? "border-warning/40 bg-warning/5" : ""}`}
          >
            <p className="text-2xl font-bold text-primary">{s.value.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Enrolment by programme */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Enrolment by programme</h2>
          <Link href="/director/students" className="text-xs text-primary hover:underline no-underline">
            View students
          </Link>
        </div>
        {enrolByCourse.length === 0 ? (
          <p className="text-xs text-gray-400">No enrolments in this period.</p>
        ) : (
          <div className="space-y-2">
            {enrolByCourse.map((e) => {
              const eCount = (e._count as { _all: number })._all;
              const e0Count = (enrolByCourse[0]._count as { _all: number })._all;
              const pct = e0Count > 0 ? Math.round((eCount / e0Count) * 100) : 0;
              return (
                <div key={e.courseId}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700 truncate pr-4">
                      {topCourseMap[e.courseId] ?? e.courseId}
                    </span>
                    <span className="font-semibold text-primary flex-shrink-0">{eCount}</span>
                  </div>
                  <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Enrolment by status breakdown */}
        <div className="border-t border-border pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(enrolMap)
            .sort(([, a], [, b]) => b - a)
            .map(([status, count]) => (
              <div key={status} className="text-center">
                <p className="text-sm font-bold text-primary">{count}</p>
                <p className="text-xs text-gray-400">{ENROL_LABEL[status] ?? status}</p>
              </div>
            ))}
          <div className="text-center">
            <p className="text-sm font-bold text-primary">{totalEnrolled}</p>
            <p className="text-xs text-gray-400">Total</p>
          </div>
        </div>
      </div>

      {/* Academic performance: pass rates per course */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Academic performance (pass rates)</h2>
          <Link href="/director/examinations" className="text-xs text-primary hover:underline no-underline">
            View examinations
          </Link>
        </div>
        {gradeCourses.length === 0 ? (
          <p className="text-xs text-gray-400">No released results yet.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 text-left border-b border-border">
                <th className="pb-1 pr-4 font-normal">Programme</th>
                <th className="pb-1 pr-4 font-normal">Passed</th>
                <th className="pb-1 pr-4 font-normal">Failed</th>
                <th className="pb-1 font-normal">Pass rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {gradeCourses.map((c) => {
                const { pass, fail } = passMap[c.id] ?? { pass: 0, fail: 0 };
                const total = pass + fail;
                const rate  = total > 0 ? Math.round((pass / total) * 100) : null;
                return (
                  <tr key={c.id}>
                    <td className="py-1.5 pr-4 font-medium">{c.title}</td>
                    <td className="py-1.5 pr-4 text-success font-medium">{pass}</td>
                    <td className="py-1.5 pr-4 text-danger">{fail}</td>
                    <td className="py-1.5">
                      {rate !== null ? (
                        <span className={`font-semibold ${rate >= 60 ? "text-success" : "text-danger"}`}>
                          {rate}%
                        </span>
                      ) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Attendance */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-sm">Attendance</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xl font-bold text-primary">{presentCount.toLocaleString()}</p>
            <p className="text-xs text-gray-400">Present marks</p>
          </div>
          <div>
            <p className="text-xl font-bold text-primary">{totalAttendanceRows.toLocaleString()}</p>
            <p className="text-xs text-gray-400">Total records</p>
          </div>
          <div>
            <p className={`text-xl font-bold ${attendanceRate !== null && attendanceRate >= 75 ? "text-success" : "text-warning"}`}>
              {attendanceRate !== null ? `${attendanceRate}%` : "N/A"}
            </p>
            <p className="text-xs text-gray-400">Overall rate</p>
          </div>
        </div>
      </div>

      {/* Finance */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Finance</h2>
          <Link href="/director/finance" className="text-xs text-primary hover:underline no-underline">
            Full finance report
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xl font-bold text-success">UGX {(collected / 1_000_000).toFixed(1)}M</p>
            <p className="text-xs text-gray-400">Collected</p>
          </div>
          <div>
            <p className={`text-xl font-bold ${outstanding > 0 ? "text-warning" : "text-gray-400"}`}>
              UGX {(outstanding / 1_000_000).toFixed(1)}M
            </p>
            <p className="text-xs text-gray-400">Outstanding</p>
          </div>
          <div>
            <p className="text-xl font-bold text-primary">UGX {(totalFees / 1_000_000).toFixed(1)}M</p>
            <p className="text-xs text-gray-400">Total fees</p>
          </div>
        </div>
      </div>

      {/* Certificates and graduates */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Certificates and graduates</h2>
          <Link href="/director/graduates" className="text-xs text-primary hover:underline no-underline">
            View graduates
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xl font-bold text-primary">{certCount.toLocaleString()}</p>
            <p className="text-xs text-gray-400">Certificates issued</p>
          </div>
          <div>
            <p className="text-xl font-bold text-primary">
              {enrolMap["COMPLETED"] ?? 0}
            </p>
            <p className="text-xs text-gray-400">Completed enrolments</p>
          </div>
        </div>
      </div>

      {/* Applications funnel */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Applications funnel</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          {["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "WITHDRAWN"].map((s) => (
            <div key={s}>
              <p className="text-xl font-bold text-primary">{(appMap[s] ?? 0).toLocaleString()}</p>
              <p className="text-xs text-gray-400">{APP_LABEL[s] ?? s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Instructor activity */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Instructor activity (classes held)</h2>
          <Link href="/director/instructors" className="text-xs text-primary hover:underline no-underline">
            View instructors
          </Link>
        </div>
        {instructorActivity.length === 0 ? (
          <p className="text-xs text-gray-400">No completed classes yet.</p>
        ) : (
          <div className="space-y-2">
            {instructorActivity.map((r) => {
              const rCount  = (r._count as { _all: number })._all;
              const maxCount = (instructorActivity[0]._count as { _all: number })._all;
              const max = maxCount || 1;
              const pct = Math.round((rCount / max) * 100);
              return (
                <div key={r.tutorId}>
                  <div className="flex justify-between text-xs mb-1">
                    <Link
                      href={`/director/instructors/${r.tutorId}`}
                      className="text-gray-700 hover:text-primary no-underline truncate pr-4"
                    >
                      {instrNameMap[r.tutorId] ?? r.tutorId}
                    </Link>
                    <span className="font-semibold text-primary flex-shrink-0">
                      {r._count._all} class{r._count._all !== 1 ? "es" : ""}
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
