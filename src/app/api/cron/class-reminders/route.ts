import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deliverClassReminder } from "@/lib/live/reminders";

export const runtime = "nodejs";
type Reminder = { id: string; liveClassId: string; channel: string; title: string; scheduledAt: Date; courseId: string };
type Recipient = { email: string | null; phone: string | null; name: string };
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const due = await db.$queryRaw<Reminder[]>`
    UPDATE live_class_reminders SET "processingAt" = NOW(), attempts = attempts + 1
    WHERE id IN (
      SELECT r.id FROM live_class_reminders r JOIN live_classes lc ON lc.id = r."liveClassId"
      WHERE r."remindAt" <= NOW() AND r."sentAt" IS NULL AND (r."processingAt" IS NULL OR r."processingAt" < NOW() - INTERVAL '5 minutes') AND lc.status = 'SCHEDULED' AND lc."scheduledAt" > NOW()
      ORDER BY r."remindAt" LIMIT 100 FOR UPDATE SKIP LOCKED
    )
    RETURNING id, "liveClassId", channel
  `;
  let sent = 0;
  let failed = 0;
  for (const reminder of due) {
    try {
      const rows = await db.$queryRaw<Array<Reminder & { courseTitle: string }>>`SELECT lc.title, lc."scheduledAt", lc."courseId", c.title AS "courseTitle" FROM live_classes lc JOIN courses c ON c.id = lc."courseId" WHERE lc.id = ${reminder.liveClassId}`;
      const cls = rows[0];
      if (cls) {
        const recipients = await db.$queryRaw<Recipient[]>`SELECT DISTINCT u.email, u.phone, u.name FROM enrolments e JOIN users u ON u.id = e."userId" WHERE e."courseId" = ${cls.courseId} AND e.status IN ('ACTIVE','PARTIALLY_PAID','COMPLETED') AND u.role = 'STUDENT'`;
        for (const recipient of recipients) await deliverClassReminder({ channel: reminder.channel, ...recipient, title: cls.title, scheduledAt: cls.scheduledAt });
      }
      await db.$executeRaw`UPDATE live_class_reminders SET "sentAt" = NOW(), "processingAt" = NULL, "lastError" = NULL WHERE id = ${reminder.id}`;
      sent += 1;
    } catch (error) {
      await db.$executeRaw`UPDATE live_class_reminders SET "processingAt" = NULL, "lastError" = ${error instanceof Error ? error.message.slice(0, 500) : "Reminder delivery failed"} WHERE id = ${reminder.id}`;
      failed += 1;
    }
  }
  return NextResponse.json({ claimed: due.length, sent, failed });
}
