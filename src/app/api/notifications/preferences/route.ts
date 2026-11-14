import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { z } from "zod";

const Schema = z.object({
  type: z.string().min(1).max(60),
  channel: z.enum(["IN_APP", "EMAIL", "SMS", "WHATSAPP"]).default("IN_APP"),
  enabled: z.boolean(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { type, channel, enabled } = parsed.data;

  await db.notificationPref.upsert({
    where: { userId_channel_type: { userId: session.user.id, channel, type } },
    create: { userId: session.user.id, channel, type, enabled },
    update: { enabled },
  });

  return NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await db.notificationPref.findMany({
    where: { userId: session.user.id },
    select: { channel: true, type: true, enabled: true },
  });

  return NextResponse.json({ prefs });
}
