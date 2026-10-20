import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessLevel } from "@/lib/enrolment/access";
import RecordingViewer from "./RecordingViewer";

export const metadata = { title: "Class replays" };
export default async function RecordingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const enrolments = await db.enrolment.findMany({ where: { userId: session.user.id, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] } }, include: { course: { select: { id: true, title: true, liveClasses: { where: { status: "COMPLETED", recordingUrl: { not: null } }, orderBy: { scheduledAt: "desc" }, select: { id: true, title: true, recordingUrl: true, scheduledAt: true, durationMin: true } } } } } });
  const available = enrolments.filter((item) => getAccessLevel(item) !== "NONE").flatMap((item) => item.course.liveClasses.map((liveClass) => ({ ...liveClass, courseTitle: item.course.title, enrolmentCourseId: item.course.id })));
  const attendance = available.length ? await db.$queryRaw<Array<{ liveClassId: string; startMark: string | null; endMark: string | null }>>`SELECT "liveClassId", "startMark"::text, "endMark"::text FROM attendance WHERE "userId" = ${session.user.id} AND "liveClassId" IN (${(await import("@prisma/client")).Prisma.join(available.map((item) => item.id))})` : [];
  const markByClass = new Map(attendance.map((item) => [item.liveClassId, item]));
  available.sort((a, b) => {
    const aAbsent = [markByClass.get(a.id)?.startMark, markByClass.get(a.id)?.endMark].includes("ABSENT");
    const bAbsent = [markByClass.get(b.id)?.startMark, markByClass.get(b.id)?.endMark].includes("ABSENT");
    return Number(bAbsent) - Number(aAbsent) || b.scheduledAt.getTime() - a.scheduledAt.getTime();
  });
  const studentRecord = await db.user.findUnique({ where: { id: session.user.id }, select: { studentNumber: true } });
  const studentNumber = studentRecord?.studentNumber ?? "Student";
  return <main className="mx-auto max-w-4xl space-y-6"><header><Link href="/dashboard/timetable" className="text-sm text-accent">Back to timetable</Link><h1 className="mt-2 text-2xl font-bold text-primary">Missed a class? Watch the recording</h1><p className="mt-1 text-sm text-gray-500">Available replays for your paid course enrolments appear here. Students marked absent are shown first.</p></header>{available.length ? available.map((item) => <div key={item.id}><p className="mb-2 text-xs text-gray-500">{item.courseTitle} · {item.scheduledAt.toLocaleDateString("en-UG")} · {item.durationMin} minutes{[markByClass.get(item.id)?.startMark, markByClass.get(item.id)?.endMark].includes("ABSENT") ? " · You were marked absent" : ""}</p><RecordingViewer title={item.title} url={item.recordingUrl!} studentName={session.user.name ?? "Student"} studentNumber={studentNumber} /></div>) : <section className="card text-sm text-gray-500">There are no class replays available yet. Instructors add a replay link after the class, or BigBlueButton recordings appear after synchronization.</section>}</main>;
}
