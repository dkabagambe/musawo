import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import StudentJoinClass from "@/app/(dashboard)/dashboard/timetable/StudentJoinClass";
import PresentationViewer from "@/components/live/PresentationViewer";
import MyGroupCard from "@/components/live/MyGroupCard";
import GroupWorkSubmitCard from "@/components/live/GroupWorkSubmitCard";
import { Video, Calendar } from "lucide-react";
import React from "react";

export const metadata = { title: "Classes - Student" };

export default async function StudentClassesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [liveNow, upcoming] = await Promise.all([
    db.liveClass.findMany({
      where: {
        status: "LIVE",
        course: { enrolments: { some: { userId: session.user.id, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] } } } },
      },
      include: { course: { select: { id: true, title: true } }, tutor: { select: { name: true } } },
    }),
    db.liveClass.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { gt: new Date() },
        course: { enrolments: { some: { userId: session.user.id, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] } } } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 10,
      include: { course: { select: { id: true, title: true } }, tutor: { select: { name: true } } },
    }),
  ]);

  const attendance = await db.attendance.findMany({
    where: {
      userId: session.user.id,
      liveClassId: { in: [...liveNow, ...upcoming].map((c) => c.id) },
    },
    select: { liveClassId: true, speakStatus: true, canSpeak: true, handRaisedAt: true },
  });
  const attByClass = new Map(attendance.map((a) => [a.liveClassId, a]));

  const PLATFORM_LABEL: Record<string, string> = { google_meet: "Google Meet", zoom: "Zoom", jitsi: "Jitsi" };

  const ClassCard = ({ cls }: { cls: typeof liveNow[0] }) => {
    const att = attByClass.get(cls.id);
    const isLive = cls.status === "LIVE";
    const date = new Date(cls.scheduledAt);
    const isToday = date.toDateString() === new Date().toDateString();
    return (
      <React.Fragment>
        <div className={`bg-white rounded-2xl border p-5 flex items-start gap-4 shadow-sm ${isLive ? "border-danger/30" : "border-border"}`}>
          <div className={`w-14 flex-shrink-0 text-center rounded-xl p-2 ${isLive ? "bg-danger" : isToday ? "bg-accent" : "bg-primary"}`}>
            <p className="text-[10px] font-bold text-white/80 uppercase leading-none">
              {date.toLocaleDateString("en-UG", { month: "short" })}
            </p>
            <p className="text-2xl font-extrabold text-white leading-tight">{date.getDate()}</p>
            <p className="text-[10px] text-white/70 leading-none">{date.toLocaleDateString("en-UG", { weekday: "short" })}</p>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-primary text-sm">{cls.title}</h3>
              {isLive && <span className="text-xs font-bold bg-danger text-white px-2 py-0.5 rounded-full animate-pulse">LIVE</span>}
              {att?.canSpeak && <span className="text-xs font-semibold bg-success/10 text-success px-2 py-0.5 rounded-full">Mic allowed</span>}
              {att?.speakStatus === "REQUESTED" && <span className="text-xs bg-warning/10 text-amber-700 px-2 py-0.5 rounded-full">Hand raised</span>}
              <span className="text-xs text-gray-400 bg-surface px-2 py-0.5 rounded-full">{PLATFORM_LABEL[cls.platform] ?? cls.platform}</span>
            </div>
            <p className="text-xs text-gray-500">{cls.course.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {date.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })} EAT &middot; {cls.durationMin} min &middot; {cls.tutor.name}
            </p>
          </div>
          <StudentJoinClass classId={cls.id} isLive={isLive} />
        </div>
        {isLive && <div className="mt-2 px-1"><PresentationViewer classId={cls.id} /></div>}
        {isLive && <div className="mt-2 px-1"><MyGroupCard classId={cls.id} courseId={cls.course?.id ?? ""} /></div>}
        {isLive && <div className="mt-2 px-1"><GroupWorkSubmitCard classId={cls.id} /></div>}
      </React.Fragment>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">Live Classes</h1>
        <p className="text-sm text-gray-500 mt-1">Join your scheduled and live classes</p>
      </div>

      {liveNow.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Live Now</h2>
          <div className="space-y-3">
            {liveNow.map((cls) => <ClassCard key={cls.id} cls={cls} />)}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
          Upcoming Classes ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-10 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-primary/40" />
            </div>
            <p className="text-gray-500 text-sm">No upcoming classes scheduled.</p>
            <Link href="/dashboard/timetable" className="text-accent text-sm font-semibold mt-2 inline-block no-underline hover:underline">
              See full timetable
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((cls) => <ClassCard key={cls.id} cls={cls as typeof liveNow[0]} />)}
          </div>
        )}
      </section>

      <div className="flex gap-3">
        <Link href="/dashboard/timetable" className="btn-outline text-sm no-underline">Full timetable</Link>
        <Link href="/dashboard/recordings" className="btn-ghost text-sm no-underline">Missed a class? Replay</Link>
      </div>
    </div>
  );
}
