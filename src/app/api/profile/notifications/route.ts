import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { z } from "zod";
import type { NotificationChannel } from "@prisma/client";

const PatchSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let preferences = await db.notificationPref.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      channel: true,
      type: true,
      enabled: true,
    },
    orderBy: [{ channel: "asc" }, { type: "asc" }],
  });

  // Create default notification preferences if none exist yet.
  // Covers all the categories the student dashboard uses.
  if (preferences.length === 0) {
    const defaults: { channel: NotificationChannel; type: string; enabled: boolean }[] = [
      { channel: "IN_APP", type: "classes", enabled: true },
      { channel: "IN_APP", type: "exams", enabled: true },
      { channel: "IN_APP", type: "assignments", enabled: true },
      { channel: "IN_APP", type: "payments", enabled: true },
      { channel: "IN_APP", type: "messages", enabled: true },
      { channel: "IN_APP", type: "announcements", enabled: true },
      { channel: "IN_APP", type: "system", enabled: true },
      { channel: "EMAIL", type: "classes", enabled: true },
      { channel: "EMAIL", type: "exams", enabled: true },
      { channel: "EMAIL", type: "payments", enabled: true },
      { channel: "EMAIL", type: "messages", enabled: true },
      { channel: "EMAIL", type: "announcements", enabled: true },
      { channel: "EMAIL", type: "system", enabled: true },
    ];

    await db.notificationPref.createMany({
      data: defaults.map((d) => ({ ...d, userId: session.user.id })),
    });

    preferences = await db.notificationPref.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        channel: true,
        type: true,
        enabled: true,
      },
      orderBy: [{ channel: "asc" }, { type: "asc" }],
    });
  }

  return NextResponse.json({ preferences });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { id, enabled } = parsed.data;

  try {
    await db.notificationPref.update({
      where: {
        id,
        userId: session.user.id, // Ensure user owns this preference
      },
      data: { enabled },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Preference not found or update failed" },
      { status: 404 }
    );
  }
}
