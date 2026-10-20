import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { endProviderMeeting } from "@/lib/live/provider";
import { remindInstructorToAddReplay } from "@/lib/live/reminders";

export const runtime = "nodejs";
type EndedClass = { id: string; title: string; tutorId: string; platform: string };
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const classes = await db.$queryRaw<EndedClass[]>`
    UPDATE live_classes lc SET status = 'COMPLETED', "recordingStatus" = CASE WHEN "recordingUrl" IS NULL THEN 'PENDING' ELSE 'AVAILABLE' END, "updatedAt" = NOW()
    WHERE lc.id IN (SELECT id FROM live_classes WHERE status = 'LIVE' AND "scheduledAt" + ("durationMin" * INTERVAL '1 minute') <= NOW() ORDER BY "scheduledAt" LIMIT 100 FOR UPDATE SKIP LOCKED)
    RETURNING id, title, "tutorId", platform`;
  for (const cls of classes) {
    if (cls.platform === "bbb") await endProviderMeeting({ classId: cls.id, provider: "bbb" }).catch((error) => console.error("Could not end BigBlueButton session", cls.id, error));
    if (cls.platform !== "bbb") {
      const tutor = await db.user.findUnique({ where: { id: cls.tutorId }, select: { name: true, email: true } });
      if (tutor) await remindInstructorToAddReplay({ email: tutor.email, name: tutor.name, title: cls.title }).catch(() => undefined);
    }
  }
  return NextResponse.json({ ended: classes.length });
}
