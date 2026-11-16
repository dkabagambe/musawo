import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Certificates - Director" };

interface Props {
  searchParams: { tab?: string; course?: string; q?: string; page?: string };
}

// Eligibility check for a student in a course.
// Returns a checklist object; eligible = all required checks pass.
async function getEligibility(userId: string, courseId: string) {
  const [enrolment, attendance, gradeEntries, certificate] = await Promise.all([
    db.enrolment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: {
        status: true, paidPercent: true, paidAmountUgx: true, totalAmountUgx: true,
        _count: { select: { payments: true } },
      },
    }),
    // Count total live classes for the course and how many the student attended
    db.liveClass.findMany({
      where: { courseId, status: "COMPLETED" },
      select: {
        id: true,
        minimumAttendancePercent: true,
        attendance: {
          where: { userId },
          select: { markedPresent: true },
        },
      },
    }),
    // Released grade entries (exams only) for this student + course
    db.gradeEntry.findMany({
      where: { userId, courseId, itemType: "EXAM", releasedAt: { not: null } },
      select: { passed: true },
    }),
    // Already has a certificate?
    db.certificate.findFirst({
      where: { userId, courseId, revokedAt: null },
      select: { id: true, uniqueId: true, issuedAt: true },
    }),
  ]);

  // Fees: 100% paid
  const feesComplete = (enrolment?.paidPercent ?? 0) >= 100 ||
    enrolment?.status === "COMPLETED";

  // Attendance: at least 75% across completed classes
  const totalClasses = attendance.length;
  const attendedCount = attendance.filter((c) => c.attendance[0]?.markedPresent).length;
  const attendancePct = totalClasses > 0 ? Math.round((attendedCount / totalClasses) * 100) : null;
  const attendanceMet = attendancePct !== null ? attendancePct >= 75 : false;

  // Exams: all released exams passed
  const releasedExamsPassed = gradeEntries.length > 0 && gradeEntries.every((g) => g.passed === true);
  const hasReleasedExams = gradeEntries.length > 0;

  const eligible =
    feesComplete &&
    attendanceMet &&
    hasReleasedExams &&
    releasedExamsPassed;

  return {
    eligible,
    feesComplete,
    feePct: enrolment?.paidPercent ?? 0,
    attendancePct,
    attendanceMet,
    examsReleased: gradeEntries.length,
    examsPassed: gradeEntries.filter((g) => g.passed).length,
    examsAllPassed: releasedExamsPassed,
    certificate,
    enrolmentStatus: enrolment?.status ?? null,
  };
}

export default async function DirectorCertificatesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "certificates.view")) redirect("/login");

  const tab    = searchParams.tab    ?? "eligible";
  const courseFilter = searchParams.course ?? "";
  const q      = searchParams.q?.trim() ?? "";
  const page   = Math.max(1, Number(searchParams.page ?? 1));
  const take   = 30;
  const skip   = (page - 1) * take;

  const allCourses = await db.course.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  // ── Issued / revoked certificates tab ────────────────────────────────────
  if (tab === "issued" || tab === "revoked") {
    const isRevoked = tab === "revoked";
    const certWhere: Record<string, unknown> = {
      revokedAt: isRevoked ? { not: null } : null,
    };
    if (courseFilter) certWhere.courseId = courseFilter;
    if (q) {
      certWhere.user = { name: { contains: q, mode: "insensitive" } };
    }

    const [certs, total] = await Promise.all([
      db.certificate.findMany({
        where:   certWhere,
        orderBy: isRevoked ? { revokedAt: "desc" } : { issuedAt: "desc" },
        take,
        skip,
        select: {
          id: true, uniqueId: true, issuedAt: true, revokedAt: true, revokedReason: true,
          fileS3Key: true,
          user:   { select: { name: true, studentNumber: true } },
          course: { select: { title: true } },
        },
      }),
      db.certificate.count({ where: certWhere }),
    ]);

    const totalPages = Math.ceil(total / take);

    const qs = (overrides: Record<string, string | number>) => {
      const params = new URLSearchParams({ tab });
      if (courseFilter) params.set("course", courseFilter);
      if (q) params.set("q", q);
      for (const [k, v] of Object.entries(overrides)) {
        if (String(v)) params.set(k, String(v));
        else params.delete(k);
      }
      return `/director/certificates?${params.toString()}`;
    };

    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <CertHeader allCourses={allCourses} tab={tab} courseFilter={courseFilter} q={q} />
        <div className="card overflow-x-auto">
          <p className="text-xs text-gray-400 mb-3">{total} certificate{total !== 1 ? "s" : ""}</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Graduate</th>
                <th className="pb-2 font-medium pr-4">Student No.</th>
                <th className="pb-2 font-medium pr-4">Programme</th>
                <th className="pb-2 font-medium pr-4">Certificate No.</th>
                {isRevoked ? (
                  <>
                    <th className="pb-2 font-medium pr-4">Revoked</th>
                    <th className="pb-2 font-medium">Reason</th>
                  </>
                ) : (
                  <>
                    <th className="pb-2 font-medium pr-4">Issued</th>
                    <th className="pb-2 font-medium">Verify</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {certs.map((c) => (
                <tr key={c.id} className="hover:bg-surface/40">
                  <td className="py-2.5 pr-4 font-medium">{c.user.name}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">{c.user.studentNumber ?? "-"}</td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">{c.course.title}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs">{c.uniqueId}</td>
                  {isRevoked ? (
                    <>
                      <td className="py-2.5 pr-4 text-xs text-gray-400">
                        {c.revokedAt ? new Date(c.revokedAt).toLocaleDateString("en-UG") : "-"}
                      </td>
                      <td className="py-2.5 text-xs text-danger">{c.revokedReason ?? "-"}</td>
                    </>
                  ) : (
                    <>
                      <td className="py-2.5 pr-4 text-xs text-gray-400">
                        {new Date(c.issuedAt).toLocaleDateString("en-UG")}
                      </td>
                      <td className="py-2.5">
                        <Link
                          href={`/verify/${c.uniqueId}`}
                          className="text-xs text-accent hover:underline no-underline"
                          prefetch={false}
                        >
                          Verify
                        </Link>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {certs.length === 0 && (
            <p className="text-center text-gray-400 py-10 text-sm">None found.</p>
          )}
          {totalPages > 1 && (
            <div className="flex justify-between mt-4 pt-4 border-t border-border">
              <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                {page > 1 && <Link href={qs({ page: page - 1 })} className="btn-outline text-xs px-3 py-1.5 no-underline">Previous</Link>}
                {page < totalPages && <Link href={qs({ page: page + 1 })} className="btn-primary text-xs px-3 py-1.5 no-underline">Next</Link>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Eligibility list (tab = "eligible" default) ───────────────────────────
  // Find students with ACTIVE/COMPLETED enrolments in published courses
  const enrolmentWhere: Record<string, unknown> = {
    status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] },
    course: { status: "PUBLISHED" },
  };
  if (courseFilter) enrolmentWhere.courseId = courseFilter;

  const userWhere: Record<string, unknown> = { role: "STUDENT" };
  if (q) userWhere.name = { contains: q, mode: "insensitive" };

  // Get enrolled students (paginated)
  const enrolments = await db.enrolment.findMany({
    where: { ...enrolmentWhere, user: userWhere },
    orderBy: [{ courseId: "asc" }, { user: { name: "asc" } }],
    take,
    skip,
    select: {
      userId: true, courseId: true,
      user:   { select: { id: true, name: true, studentNumber: true } },
      course: { select: { id: true, title: true } },
    },
  });
  const totalEnrolments = await db.enrolment.count({
    where: { ...enrolmentWhere, user: userWhere },
  });
  const totalPages = Math.ceil(totalEnrolments / take);

  // Build eligibility for each enrolment (batched individually — small page size keeps this manageable)
  const eligibilityRows = await Promise.all(
    enrolments.map(async (enr) => {
      const elig = await getEligibility(enr.userId, enr.courseId);
      return { enr, elig };
    })
  );

  // Pending CERTIFICATE_ISSUANCE approvals (to show "pending" badge)
  const pendingCertApprovals = await db.approvalRequest.findMany({
    where: {
      type:   "CERTIFICATE_ISSUANCE",
      status: { in: ["SUBMITTED", "IN_REVIEW"] },
    },
    select: { id: true, studentId: true, courseId: true, status: true },
  });
  const pendingKey = new Set(
    pendingCertApprovals.map((a) => `${a.studentId}:${a.courseId}`)
  );
  const pendingApprovalById: Record<string, string> = {};
  for (const a of pendingCertApprovals) {
    if (a.studentId && a.courseId) pendingApprovalById[`${a.studentId}:${a.courseId}`] = a.id;
  }

  const eligibleCount  = eligibilityRows.filter((r) => r.elig.eligible && !r.elig.certificate).length;
  const issuedCount    = eligibilityRows.filter((r) => r.elig.certificate).length;
  const ineligibleCount = eligibilityRows.filter((r) => !r.elig.eligible && !r.elig.certificate).length;

  const qs = (overrides: Record<string, string | number>) => {
    const params = new URLSearchParams({ tab });
    if (courseFilter) params.set("course", courseFilter);
    if (q) params.set("q", q);
    for (const [k, v] of Object.entries(overrides)) {
      if (String(v)) params.set(k, String(v));
      else params.delete(k);
    }
    return `/director/certificates?${params.toString()}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <CertHeader allCourses={allCourses} tab={tab} courseFilter={courseFilter} q={q} />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Eligible (no cert yet)", value: eligibleCount, style: "text-success" },
          { label: "Already issued",          value: issuedCount,   style: "text-primary" },
          { label: "Not yet eligible",        value: ineligibleCount, style: "text-gray-400" },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <p className={`text-2xl font-bold ${s.style}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Eligibility table */}
      <div className="card overflow-x-auto">
        <p className="text-xs text-gray-400 mb-3">
          {totalEnrolments} enrolled student{totalEnrolments !== 1 ? "s" : ""}
          {q ? ` matching "${q}"` : ""}
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Student</th>
              <th className="pb-2 font-medium pr-4">Programme</th>
              <th className="pb-2 font-medium pr-4">Fees</th>
              <th className="pb-2 font-medium pr-4">Attendance</th>
              <th className="pb-2 font-medium pr-4">Exams</th>
              <th className="pb-2 font-medium pr-4">Eligible</th>
              <th className="pb-2 font-medium">Certificate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {eligibilityRows.map(({ enr, elig }) => {
              const key = `${enr.userId}:${enr.courseId}`;
              const isPending = pendingKey.has(key);
              const pendingId = pendingApprovalById[key];
              return (
                <tr key={key} className="hover:bg-surface/40">
                  <td className="py-2.5 pr-4">
                    <Link
                      href={`/director/students/${enr.user.id}`}
                      className="font-medium text-primary hover:underline no-underline"
                    >
                      {enr.user.name}
                    </Link>
                    {enr.user.studentNumber && (
                      <p className="text-xs font-mono text-gray-400">{enr.user.studentNumber}</p>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">{enr.course.title}</td>
                  {/* Fees */}
                  <td className="py-2.5 pr-4">
                    <span className={`badge text-xs ${elig.feesComplete ? "badge-success" : "badge-danger"}`}>
                      {elig.feePct}%
                    </span>
                  </td>
                  {/* Attendance */}
                  <td className="py-2.5 pr-4">
                    {elig.attendancePct !== null ? (
                      <span className={`badge text-xs ${elig.attendanceMet ? "badge-success" : "badge-danger"}`}>
                        {elig.attendancePct}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">No classes</span>
                    )}
                  </td>
                  {/* Exams */}
                  <td className="py-2.5 pr-4">
                    {elig.examsReleased > 0 ? (
                      <span className={`badge text-xs ${elig.examsAllPassed ? "badge-success" : "badge-danger"}`}>
                        {elig.examsPassed}/{elig.examsReleased} passed
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">No results</span>
                    )}
                  </td>
                  {/* Eligible overall */}
                  <td className="py-2.5 pr-4">
                    <span className={`badge text-xs ${elig.eligible ? "badge-success" : "badge-warning"}`}>
                      {elig.eligible ? "Yes" : "Not yet"}
                    </span>
                  </td>
                  {/* Certificate status */}
                  <td className="py-2.5">
                    {elig.certificate ? (
                      <div className="space-y-0.5">
                        <span className="badge text-xs badge-success">Issued</span>
                        <p className="text-xs font-mono text-gray-400">{elig.certificate.uniqueId}</p>
                      </div>
                    ) : isPending ? (
                      <Link
                        href={`/director/approvals/${pendingId}`}
                        className="badge text-xs badge-warning hover:underline no-underline"
                      >
                        Pending approval
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-300">Not issued</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {eligibilityRows.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">No students found.</p>
        )}

        {totalPages > 1 && (
          <div className="flex justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && <Link href={qs({ page: page - 1 })} className="btn-outline text-xs px-3 py-1.5 no-underline">Previous</Link>}
              {page < totalPages && <Link href={qs({ page: page + 1 })} className="btn-primary text-xs px-3 py-1.5 no-underline">Next</Link>}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        To approve certificate issuance, ask the Principal to submit a certificate issuance request,
        then approve it from{" "}
        <Link href="/director/approvals" className="text-primary hover:underline">
          Approvals
        </Link>
        . Revocation also goes through an approval request.
      </p>
    </div>
  );
}

// ── Shared header component ────────────────────────────────────────────────────
function CertHeader({
  allCourses,
  tab,
  courseFilter,
  q,
}: {
  allCourses: { id: string; title: string }[];
  tab: string;
  courseFilter: string;
  q: string;
}) {
  const tabs = [
    { key: "eligible", label: "Eligibility" },
    { key: "issued",   label: "Issued" },
    { key: "revoked",  label: "Revoked" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-primary">Certificates</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Eligibility checklist and issued certificate register.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/director/certificates?tab=${t.key}${courseFilter ? `&course=${courseFilter}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`px-4 py-2 text-sm no-underline rounded-t-lg ${
              tab === t.key
                ? "text-primary font-semibold border-b-2 border-primary"
                : "text-gray-500 hover:text-primary"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Shared filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <input type="hidden" name="tab" value={tab} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search student name..."
          className="input text-sm max-w-xs"
        />
        <select name="course" defaultValue={courseFilter} className="input text-sm max-w-xs">
          <option value="">All programmes</option>
          {allCourses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <button type="submit" className="btn-secondary text-sm">Filter</button>
        {(q || courseFilter) && (
          <Link
            href={`/director/certificates?tab=${tab}`}
            className="btn-ghost text-sm no-underline"
          >
            Clear
          </Link>
        )}
      </form>
    </div>
  );
}
