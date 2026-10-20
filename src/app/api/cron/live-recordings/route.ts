import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchProviderRecordings } from "@/lib/live/provider";

export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.BBB_URL || !process.env.BBB_SECRET) return NextResponse.json({ synchronized: 0, provider: "BigBlueButton is not configured" });
  const classes = await db.$queryRaw<Array<{ id: string }>>`SELECT id FROM live_classes WHERE platform = 'bbb' AND status = 'COMPLETED' AND "recordingUrl" IS NULL AND "recordingStatus" IN ('PENDING','SYNC_FAILED') ORDER BY "updatedAt" DESC LIMIT 100`;
  let synchronized = 0;
  for (const liveClass of classes) {
    try {
      const recordings = await fetchProviderRecordings(liveClass.id);
      if (!recordings.length) continue;
      await db.$executeRaw`UPDATE live_classes SET "recordingUrl" = ${recordings[0]}, "recordingStatus" = 'AVAILABLE', "updatedAt" = NOW() WHERE id = ${liveClass.id}`;
      synchronized += 1;
    } catch (error) {
      await db.$executeRaw`UPDATE live_classes SET "recordingStatus" = 'SYNC_FAILED' WHERE id = ${liveClass.id}`;
      console.error("BigBlueButton recording synchronization failed", liveClass.id, error);
    }
  }
  return NextResponse.json({ synchronized, checked: classes.length });
}
