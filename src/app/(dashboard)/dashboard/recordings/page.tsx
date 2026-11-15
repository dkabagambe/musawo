import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { getAccessLevel } from "@/lib/enrolment/access";
import RecordingViewer from "./RecordingViewer";
import RecordingsFilter from "./RecordingsFilter";
import { PlayCircle, Clock, AlertCircle, Search } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Class replays" };

export default async function RecordingsPage({
  searchParams,
}: {
  searchParams: { q?: string; course?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrolments = await db.enrolment.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED", "OVERDUE"] },
    },
    select: {
      id: true,
      status: true,
      paidPercent: true,
      provisionalUntil: true,
      graceUntil: true,
      overdueSince: true,
      course: {
        select: {
          id: true,
          title: true,
          liveClasses: {
            where: { status: "COMPLETED" },
            orderBy: { scheduledAt: "desc" },
            select: {
              id: true,
              title: true,
              recordingUrl: true,
              recordingStatus: true,
              scheduledAt: true,
              durationMin: true,
            },
          },
        },
      },
    },
  });

  // Filter by access level - must have at least PARTIAL access (50%+ paid)
  const available = enrolments
    .filter((enr) => {
      const level = getAccessLevel({
        status: enr.status,
        paidPercent: enr.paidPercent,
        provisionalUntil: enr.provisionalUntil,
        graceUntil: enr.graceUntil,
        overdueSince: enr.overdueSince,
      });
      return ["PARTIAL", "FULL", "OVERDUE", "COMPLETED"].includes(level);
    })
    .flatMap((item) =>
      item.course.liveClasses.map((liveClass) => ({
        ...liveClass,
        courseTitle: item.course.title,
        enrolmentCourseId: item.course.id,
      }))
    );

  // Fetch attendance marks to flag "Missed" (absent) classes
  const attendance = available.length
    ? await db.$queryRaw<Array<{ liveClassId: string; startMark: string | null; endMark: string | null }>>`SELECT "liveClassId", "startMark"::text, "endMark"::text FROM attendance WHERE "userId" = ${session.user.id} AND "liveClassId" IN (${(await import("@prisma/client")).Prisma.join(available.map((item) => item.id))})`
    : [];
  const markByClass = new Map(attendance.map((item) => [item.liveClassId, item]));

  // Apply search filter
  const query = (searchParams.q ?? "").trim().toLowerCase();
  const courseFilter = searchParams.course ?? "all";
  let filtered = available;
  if (query) {
    filtered = filtered.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.courseTitle.toLowerCase().includes(query),
    );
  }
  if (courseFilter !== "all") {
    filtered = filtered.filter((item) => item.enrolmentCourseId === courseFilter);
  }

  // Sort: absent first, then newest first
  filtered.sort((a, b) => {
    const aAbsent = [markByClass.get(a.id)?.startMark, markByClass.get(a.id)?.endMark].includes("ABSENT");
    const bAbsent = [markByClass.get(b.id)?.startMark, markByClass.get(b.id)?.endMark].includes("ABSENT");
    return Number(bAbsent) - Number(aAbsent) || b.scheduledAt.getTime() - a.scheduledAt.getTime();
  });

  // Separate recordings from pending
  const withRecording = filtered.filter((item) => item.recordingUrl);
  const recordingPending = filtered.filter((item) => !item.recordingUrl);

  const studentRecord = await db.user.findUnique({
    where: { id: session.user.id },
    select: { studentNumber: true },
  });
  const studentNumber = studentRecord?.studentNumber ?? "Student";

  // Build course options for the filter dropdown
  const courseOptions = Array.from(
    new Map(enrolments.map((e) => [e.course.id, e.course.title])).values(),
  ).map((title, _i) => ({ id: enrolments.find((e) => e.course.title === title)!.course.id, title }));

  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <header>
        <Link href="/dashboard/timetable" className="text-sm text-accent no-underline hover:underline">
          Back to timetable
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-primary">Class Replays</h1>
        <p className="mt-1 text-sm text-gray-500">
          Available replays for your paid course enrolments. Classes you missed are shown first.
        </p>
      </header>

      {/* Search + filter */}
      {available.length > 0 && (
        <RecordingsFilter
          courses={courseOptions}
          currentQuery={query}
          currentCourse={courseFilter}
        />
      )}

      {/* Recordings available */}
      {withRecording.length > 0 && (
        <div className="space-y-4">
          {withRecording.map((item) => {
            const isAbsent = [markByClass.get(item.id)?.startMark, markByClass.get(item.id)?.endMark].includes("ABSENT");
            return (
              <div key={item.id}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <p className="text-xs text-gray-500">
                    {item.courseTitle} &middot; {item.scheduledAt.toLocaleDateString("en-UG")} &middot; {item.durationMin} min
                  </p>
                  {isAbsent && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-danger/10 text-danger px-2 py-0.5 rounded-full">
                      <AlertCircle className="w-3 h-3" /> Missed
                    </span>
                  )}
                </div>
                <RecordingViewer
                  title={item.title}
                  url={item.recordingUrl!}
                  studentName={session.user.name ?? "Student"}
                  studentNumber={studentNumber}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Recording pending */}
      {recordingPending.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recording Pending</h2>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="divide-y divide-border">
              {recordingPending.map((item) => {
                const isAbsent = [markByClass.get(item.id)?.startMark, markByClass.get(item.id)?.endMark].includes("ABSENT");
                return (
                  <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-9 h-9 bg-surface rounded-xl flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary truncate">
                        {item.title}
                        {isAbsent && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-danger">
                            <AlertCircle className="w-3 h-3" /> Missed
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {item.courseTitle} &middot; {item.scheduledAt.toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">Recording pending</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {available.length === 0 && (
        <section className="card text-sm text-gray-500">
          There are no class replays available yet. Instructors add a replay link after the class,
          or BigBlueButton recordings appear after synchronization.
        </section>
      )}

      {available.length > 0 && withRecording.length === 0 && recordingPending.length === 0 && (
        <section className="card text-sm text-gray-500">
          No recordings match your search.
        </section>
      )}
    </main>
  );
}
