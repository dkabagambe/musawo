import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props { params: { id: string } }

export default async function DirectorInstructorDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "staff.view")) redirect("/login");

  const instructor = await db.user.findUnique({
    where: { id: params.id, role: "INSTRUCTOR" },
    select: {
      id: true, name: true, email: true, phone: true, status: true,
      createdAt: true, avatarUrl: true, bio: true, professionalTitle: true,
    },
  });

  if (!instructor) notFound();

  // All courses (primary + co-tutor)
  const [primaryCourses, coTaughtRows] = await Promise.all([
    db.course.findMany({
      where: { tutorId: params.id },
      select: {
        id: true, title: true, courseCode: true, status: true,
        _count: { select: { enrolments: true, blocks: true } },
        intakes: {
          orderBy: { startDate: "desc" },
          take: 1,
          select: { label: true },
        },
      },
    }),
    db.coTutor.findMany({
      where: { tutorId: params.id },
      select: {
        course: {
          select: {
            id: true, title: true, courseCode: true, status: true,
            _count: { select: { enrolments: true, blocks: true } },
            intakes: {
              orderBy: { startDate: "desc" },
              take: 1,
              select: { label: true },
            },
          },
        },
      },
    }),
  ]);

  const courses = [
    ...primaryCourses.map((c) => ({ ...c, role: "Lead instructor" })),
    ...coTaughtRows
      .filter((ct) => !primaryCourses.some((pc) => pc.id === ct.course.id))
      .map((ct) => ({ ...ct.course, role: "Co-instructor" })),
  ];

  // Live classes this instructor ran
  const liveClasses = await db.liveClass.findMany({
    where: { tutorId: params.id },
    orderBy: { scheduledAt: "desc" },
    take: 50,
    select: {
      id: true, title: true, scheduledAt: true, status: true, durationMin: true,
      course: { select: { title: true } },
      _count: { select: { attendance: true } },
    },
  });

  const classesDone      = liveClasses.filter((c) => c.status === "COMPLETED").length;
  const classesScheduled = liveClasses.filter((c) => c.status === "SCHEDULED").length;

  // Assignments graded
  const gradedCount = await db.assignmentSubmission.count({
    where: { gradedBy: params.id, gradedAt: { not: null } },
  });

  // Students enrolled in this instructor's courses
  const courseIds = courses.map((c) => c.id);
  const students = await db.enrolment.findMany({
    where: { courseId: { in: courseIds }, status: { in: ["ACTIVE", "PARTIALLY_PAID", "OVERDUE", "COMPLETED"] } },
    select: {
      status: true,
      course: { select: { title: true } },
      user:   { select: { id: true, name: true, studentNumber: true } },
    },
    orderBy: [{ courseId: "asc" }, { user: { name: "asc" } }],
    take: 200,
  });

  const STATUS_STYLE: Record<string, string> = {
    ACTIVE:    "badge-success",
    SUSPENDED: "badge-danger",
  };
  const CLASS_STYLE: Record<string, string> = {
    COMPLETED:  "badge-success",
    SCHEDULED:  "badge-info",
    LIVE:       "badge-warning",
    CANCELLED:  "badge-danger",
    RESCHEDULED:"badge-warning",
  };
  const ENROL_STYLE: Record<string, string> = {
    ACTIVE:         "badge-success",
    COMPLETED:      "badge-success",
    PARTIALLY_PAID: "badge-warning",
    OVERDUE:        "badge-danger",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/director/instructors" className="text-xs text-gray-400 hover:text-primary no-underline">
        &larr; Back to Instructors
      </Link>

      {/* Profile card */}
      <div className="card">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary flex-shrink-0">
            {instructor.avatarUrl
              ? <img src={instructor.avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
              : instructor.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-primary">
                {instructor.professionalTitle ? `${instructor.professionalTitle} ` : ""}
                {instructor.name}
              </h1>
              <span className={`badge text-xs ${STATUS_STYLE[instructor.status] ?? "badge-info"}`}>
                {instructor.status}
              </span>
            </div>
            <div className="mt-1.5 text-xs text-gray-500 space-y-0.5">
              {instructor.email && <p>Email: {instructor.email}</p>}
              {instructor.phone && <p>Phone: {instructor.phone}</p>}
              {instructor.bio   && <p className="mt-2 text-gray-400 max-w-prose">{instructor.bio}</p>}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Joined {new Date(instructor.createdAt).toLocaleDateString("en-UG")}
            </p>
          </div>
        </div>

        {/* Summary metrics */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Courses",         value: courses.length },
            { label: "Classes total",   value: liveClasses.length },
            { label: "Classes held",    value: classesDone },
            { label: "Graded submits",  value: gradedCount },
          ].map((m) => (
            <div key={m.label} className="rounded-xl bg-surface p-3 text-center">
              <p className="text-xl font-bold text-primary">{m.value}</p>
              <p className="text-xs text-gray-400">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Courses assigned */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-sm">Courses assigned</h2>
        {courses.length === 0 ? (
          <p className="text-xs text-gray-400">Not assigned to any courses.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 text-left border-b border-border">
                <th className="pb-1 pr-4 font-normal">Course</th>
                <th className="pb-1 pr-4 font-normal">Role</th>
                <th className="pb-1 pr-4 font-normal">Students</th>
                <th className="pb-1 pr-4 font-normal">Intake</th>
                <th className="pb-1 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {courses.map((c) => (
                <tr key={c.id}>
                  <td className="py-1.5 pr-4 font-medium">{c.title}</td>
                  <td className="py-1.5 pr-4 text-gray-400">{c.role}</td>
                  <td className="py-1.5 pr-4">{c._count.enrolments}</td>
                  <td className="py-1.5 pr-4 text-gray-400">{c.intakes[0]?.label ?? "-"}</td>
                  <td className="py-1.5">
                    <span className={`badge text-xs ${c.status === "PUBLISHED" ? "badge-success" : c.status === "ARCHIVED" ? "badge-danger" : "badge-warning"}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Live classes */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold text-sm">Live classes</h2>
          <span className="text-xs text-gray-400">
            {classesDone} held, {classesScheduled} scheduled
          </span>
        </div>
        {liveClasses.length === 0 ? (
          <p className="text-xs text-gray-400">No live classes on record.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 text-left border-b border-border">
                <th className="pb-1 pr-4 font-normal">Class</th>
                <th className="pb-1 pr-4 font-normal">Course</th>
                <th className="pb-1 pr-4 font-normal">Date</th>
                <th className="pb-1 pr-4 font-normal">Students</th>
                <th className="pb-1 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {liveClasses.slice(0, 20).map((cls) => (
                <tr key={cls.id}>
                  <td className="py-1.5 pr-4">{cls.title}</td>
                  <td className="py-1.5 pr-4 text-gray-400">{cls.course.title}</td>
                  <td className="py-1.5 pr-4 text-gray-400">
                    {new Date(cls.scheduledAt).toLocaleDateString("en-UG")}
                  </td>
                  <td className="py-1.5 pr-4">{cls._count.attendance}</td>
                  <td className="py-1.5">
                    <span className={`badge text-xs ${CLASS_STYLE[cls.status] ?? "badge-info"}`}>
                      {cls.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {liveClasses.length > 20 && (
          <p className="text-xs text-gray-400">
            Showing 20 of {liveClasses.length} classes.
          </p>
        )}
      </div>

      {/* Students in this instructor's courses */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-sm">Students ({students.length})</h2>
        {students.length === 0 ? (
          <p className="text-xs text-gray-400">No active students in assigned courses.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 text-left border-b border-border">
                <th className="pb-1 pr-4 font-normal">Name</th>
                <th className="pb-1 pr-4 font-normal">Student No.</th>
                <th className="pb-1 pr-4 font-normal">Course</th>
                <th className="pb-1 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((enr, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-4">
                    <Link
                      href={`/director/students/${enr.user.id}`}
                      className="text-primary hover:underline no-underline"
                    >
                      {enr.user.name}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-4 font-mono text-gray-400">
                    {enr.user.studentNumber ?? "-"}
                  </td>
                  <td className="py-1.5 pr-4 text-gray-400">{enr.course.title}</td>
                  <td className="py-1.5">
                    <span className={`badge text-xs ${ENROL_STYLE[enr.status] ?? "badge-info"}`}>
                      {enr.status.replace(/_/g, " ")}
                    </span>
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
