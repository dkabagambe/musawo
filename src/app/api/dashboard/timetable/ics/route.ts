import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";

function toICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "").slice(0, 15) + "Z";
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch the student's upcoming and recent classes
  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] } },
    select: { courseId: true },
  });
  const courseIds = enrolments.map((e) => e.courseId);
  if (courseIds.length === 0) {
    return new NextResponse("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Musawo//Empty//EN\r\nEND:VCALENDAR\r\n", {
      headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="timetable-musawo.ics"' },
    });
  }

  const classes = await db.liveClass.findMany({
    where: {
      courseId: { in: courseIds },
      status: { in: ["SCHEDULED", "LIVE", "RESCHEDULED"] },
      scheduledAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60_000) },
    },
    orderBy: { scheduledAt: "asc" },
    include: { course: { select: { title: true } } },
  });

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Musawo Training Center//Timetable//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${session.user.name ?? "Student"} Timetable - Musawo TC`,
    "X-WR-TIMEZONE:Africa/Kampala",
  ];

  for (const cls of classes) {
    const start = cls.scheduledAt;
    const end = new Date(start.getTime() + cls.durationMin * 60_000);
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${cls.id}@musawo.ug`);
    lines.push(`DTSTART:${toICSDate(start)}`);
    lines.push(`DTEND:${toICSDate(end)}`);
    lines.push(`SUMMARY:${icsEscape(cls.title)}`);
    lines.push(`DESCRIPTION:${icsEscape(cls.course.title + (cls.joinUrl ? " | " + cls.joinUrl : ""))}`);
    if (cls.joinUrl) lines.push(`URL:${cls.joinUrl}`);
    if (cls.venue) lines.push(`LOCATION:${icsEscape(cls.venue)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="timetable-musawo.ics"',
    },
  });
}
