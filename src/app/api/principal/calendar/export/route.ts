import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/principal/calendar/export
 * Export calendar events as .ics file for calendar subscription
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Get all future and recent events (last 30 days + all future)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const events = await db.calendarEvent.findMany({
      where: {
        eventDate: { gte: thirtyDaysAgo },
      },
      orderBy: { eventDate: "asc" },
    });

    // Generate ICS content
    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Musawo Training Center//Academic Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:MTC Academic Calendar",
      "X-WR-TIMEZONE:Africa/Kampala",
      "X-WR-CALDESC:Musawo Training Center Academic Calendar - Intake dates, exam periods, holidays, and events",
    ];

    for (const event of events) {
      const uid = `${event.id}@mtc.ac.ug`;
      const dtstart = formatICSDate(event.eventDate, event.isAllDay);
      const dtend = event.endDate
        ? formatICSDate(event.endDate, event.isAllDay)
        : formatICSDate(addDay(event.eventDate), event.isAllDay);
      const dtstamp = formatICSDate(event.createdAt, false);
      const summary = escapeICSText(event.title);
      const description = event.description ? escapeICSText(event.description) : "";

      icsLines.push("BEGIN:VEVENT");
      icsLines.push(`UID:${uid}`);
      icsLines.push(`DTSTAMP:${dtstamp}`);
      icsLines.push(`DTSTART${event.isAllDay ? ";VALUE=DATE" : ""}:${dtstart}`);
      icsLines.push(`DTEND${event.isAllDay ? ";VALUE=DATE" : ""}:${dtend}`);
      icsLines.push(`SUMMARY:${summary}`);
      if (description) {
        icsLines.push(`DESCRIPTION:${description}`);
      }
      icsLines.push(`CATEGORIES:${event.eventType}`);
      icsLines.push("STATUS:CONFIRMED");
      icsLines.push("TRANSP:OPAQUE");
      icsLines.push("END:VEVENT");
    }

    icsLines.push("END:VCALENDAR");

    const icsContent = icsLines.join("\r\n");

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="mtc-academic-calendar.ics"',
      },
    });
  } catch (error) {
    console.error("Failed to export calendar:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Format date for ICS file
 * All-day events: YYYYMMDD
 * Timed events: YYYYMMDDTHHmmssZ (UTC)
 */
function formatICSDate(date: Date, isAllDay: boolean): string {
  if (isAllDay) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  } else {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }
}

/**
 * Add one day to a date (for all-day event end dates)
 */
function addDay(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + 1);
  return result;
}

/**
 * Escape text for ICS format
 * Replace newlines, commas, semicolons
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
