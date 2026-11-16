import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Instructors - Director" };

interface Props {
  searchParams: { q?: string; page?: string };
}

export default async function DirectorInstructorsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "staff.view")) redirect("/login");

  const q    = searchParams.q?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 20;
  const skip = (page - 1) * take;

  const userWhere: Record<string, unknown> = { role: "INSTRUCTOR" };
  if (q) {
    userWhere.OR = [
      { name:  { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [instructors, total] = await Promise.all([
    db.user.findMany({
      where:   userWhere,
      orderBy: { name: "asc" },
      take,
      skip,
      select: {
        id: true, name: true, email: true, phone: true,
        status: true, createdAt: true, avatarUrl: true,
      },
    }),
    db.user.count({ where: userWhere }),
  ]);

  const totalPages = Math.ceil(total / take);

  // Gather per-instructor activity metrics in one query batch
  const ids = instructors.map((i) => i.id);

  const [
    courseAssignments,
    coTaughtCourses,
    liveClassStats,
    submissionGrading,
    examResultStats,
    lastActiveDates,
  ] = await Promise.all([
    // Primary tutor assignments
    db.course.findMany({
      where:  { tutorId: { in: ids } },
      select: { tutorId: true, title: true, status: true, id: true },
    }),
    // Co-tutor assignments
    db.coTutor.findMany({
      where:  { tutorId: { in: ids } },
      select: { tutorId: true, course: { select: { id: true, title: true, status: true } } },
    }),
    // Live class stats: total scheduled/completed and roll calls recorded
    db.liveClass.groupBy({
      by:    ["tutorId"],
      where: { tutorId: { in: ids } },
      _count: { id: true },
    }),
    // Assignment submissions graded by this instructor
    db.assignmentSubmission.groupBy({
      by:    ["gradedBy"],
      where: { gradedBy: { in: ids }, gradedAt: { not: null } },
      _count: { id: true },
    }),
    // Exam results (grade entries) where the exam belongs to their courses
    db.gradeEntry.groupBy({
      by:    ["courseId"],
      where: {
        course: { tutorId: { in: ids } },
        releasedAt: { not: null },
      },
      _count: { id: true },
    }),
    // Last live class start (as a proxy for last activity)
    db.liveClass.findMany({
      where: { tutorId: { in: ids }, status: { in: ["LIVE", "COMPLETED"] } },
      orderBy: { scheduledAt: "desc" },
      select: { tutorId: true, scheduledAt: true },
      distinct: ["tutorId"],
    }),
  ]);

  // Merge course assignments (primary + co-tutor)
  const courseMap: Record<string, { title: string; status: string }[]> = {};
  for (const c of courseAssignments) {
    if (!courseMap[c.tutorId]) courseMap[c.tutorId] = [];
    courseMap[c.tutorId].push({ title: c.title, status: c.status });
  }
  for (const ct of coTaughtCourses) {
    const tid = ct.tutorId;
    if (!courseMap[tid]) courseMap[tid] = [];
    if (!courseMap[tid].some((c) => c.title === ct.course.title)) {
      courseMap[tid].push({ title: ct.course.title, status: ct.course.status });
    }
  }

  const classCountMap: Record<string, number> = {};
  for (const row of liveClassStats) {
    classCountMap[row.tutorId] = row._count.id;
  }

  const gradingCountMap: Record<string, number> = {};
  for (const row of submissionGrading) {
    if (row.gradedBy) gradingCountMap[row.gradedBy] = row._count.id;
  }

  const lastActiveMap: Record<string, Date> = {};
  for (const row of lastActiveDates) {
    lastActiveMap[row.tutorId] = row.scheduledAt;
  }

  const STATUS_STYLE: Record<string, string> = {
    ACTIVE:    "badge-success",
    SUSPENDED: "badge-danger",
  };

  function qs(overrides: Record<string, string | number>) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    for (const [k, v] of Object.entries(overrides)) {
      if (String(v)) params.set(k, String(v));
    }
    return `/director/instructors?${params.toString()}`;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Instructors</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {total} instructor{total !== 1 ? "s" : ""}
        </p>
      </div>

      <form method="GET" className="flex gap-3 flex-wrap">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name or email..."
          className="input text-sm max-w-sm"
        />
        <button type="submit" className="btn-secondary text-sm">Search</button>
        {q && (
          <Link href="/director/instructors" className="btn-ghost text-sm no-underline">
            Clear
          </Link>
        )}
      </form>

      {instructors.length === 0 ? (
        <div className="card py-16 text-center text-gray-400 text-sm">
          No instructors found.
        </div>
      ) : (
        <div className="space-y-3">
          {instructors.map((inst) => {
            const courses   = courseMap[inst.id]    ?? [];
            const classCnt  = classCountMap[inst.id] ?? 0;
            const gradeCnt  = gradingCountMap[inst.id] ?? 0;
            const lastActive = lastActiveMap[inst.id];
            return (
              <div key={inst.id} className="card">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                    {inst.avatarUrl
                      ? <img src={inst.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                      : inst.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/director/instructors/${inst.id}`}
                        className="font-semibold text-primary hover:underline no-underline"
                      >
                        {inst.name}
                      </Link>
                      <span className={`badge text-xs ${STATUS_STYLE[inst.status] ?? "badge-info"}`}>
                        {inst.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {inst.email ?? inst.phone ?? "-"}
                    </p>
                    {/* Activity metrics */}
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>{classCnt} class{classCnt !== 1 ? "es" : ""} total</span>
                      <span>{gradeCnt} submission{gradeCnt !== 1 ? "s" : ""} graded</span>
                      {lastActive && (
                        <span>
                          Last active: {new Date(lastActive).toLocaleDateString("en-UG")}
                        </span>
                      )}
                      {!lastActive && (
                        <span className="text-gray-300">No classes held yet</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">
                    Joined {new Date(inst.createdAt).toLocaleDateString("en-UG")}
                  </p>
                </div>

                {/* Courses */}
                {courses.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {courses.map((c) => (
                      <span
                        key={c.title}
                        className={`text-xs px-2.5 py-1 rounded-full ${
                          c.status === "PUBLISHED"
                            ? "bg-primary/10 text-primary"
                            : "bg-surface text-gray-500"
                        }`}
                      >
                        {c.title}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-2">Not assigned to any courses.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between pt-2">
          <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
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
  );
}
