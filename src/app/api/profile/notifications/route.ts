import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { z } from "zod";

const PatchSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preferences = await db.notificationPref.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      channel: true,
      type: true,
      enabled: true,
    },
    orderBy: [{ channel: "asc" }, { type: "asc" }],
  });

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
