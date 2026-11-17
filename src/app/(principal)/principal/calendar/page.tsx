import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import CalendarView from "./CalendarView";
export const dynamic = "force-dynamic";

export const metadata = { title: "Academic Calendar - Principal" };

export default async function PrincipalCalendarPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) redirect("/403");

  const canEdit = can(session.user.role, "courses.edit");

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [intakes, exams, classes, calendarEvents] = await Promise.all([
    db.intake.findMany({
      where: { endDate: { gte: thirtyDaysAgo } },
      orderBy: { startDate: "asc" },
      include: { course: { select: { title: true, courseCode: true } } },
    }),
    db.exam.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { course: { select: { title: true } } },
    }),
    db.liveClass.findMany({
      where: {
        scheduledAt: { gte: thirtyDaysAgo },
      },
      orderBy: { scheduledAt: "asc" },
      include: {
        course: { select: { title: true } },
        tutor: { select: { name: true } },
      },
    }),
    db.calendarEvent.findMany({
      where: { eventDate: { gte: thirtyDaysAgo } },
      orderBy: { eventDate: "asc" },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    }),
  ]);

  type UnifiedEvent = {
    id: string;
    date: Date;
    endDate?: Date | null;
    label: string;
    description?: string | null;
    type: "intake" | "exam" | "class" | "calendar_event";
    eventType?: string;
    isAllDay?: boolean;
    createdBy?: { id: string; name: string };
  };

  const events: UnifiedEvent[] = [
    ...intakes.map((i) => ({
      id: i.id,
      date: i.startDate,
      endDate: i.endDate,
      label: `${i.course.title} (${i.label})`,
      description: `Intake period for ${i.course.courseCode}`,
      type: "intake" as const,
    })),
    ...exams.map((e) => ({
      id: e.id,
      date: e.createdAt,
      label: e.title,
      description: `Exam: ${e.course.title}`,
      type: "exam" as const,
    })),
    ...classes.map((c) => ({
      id: c.id,
      date: c.scheduledAt,
      label: c.title,
      description: `${c.course.title} - ${c.tutor.name}`,
      type: "class" as const,
    })),
    ...calendarEvents.map((ce) => ({
      id: ce.id,
      date: ce.eventDate,
      endDate: ce.endDate,
      label: ce.title,
      description: ce.description,
      type: "calendar_event" as const,
      eventType: ce.eventType,
      isAllDay: ce.isAllDay,
      createdBy: ce.createdBy,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <CalendarView
      events={events}
      canEdit={canEdit}
    />
  );
}
