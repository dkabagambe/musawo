import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { z } from "zod";

const CreateClassSchema = z.object({
  courseId: z.string().cuid(),
  blockId: z.string().cuid().optional(),
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  scheduledAt: z.string().datetime(),
  durationMin: z.number().int().min(15).max(480).default(60),
  joinUrl: z.string().url(),
  platform: z.enum(["google_meet", "zoom", "jitsi"]).default("google_meet"),
});

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classes = await db.liveClass.findMany({
    where: { tutorId: session.user.id },
    orderBy: { scheduledAt: "desc" },
    include: { course: { select: { title: true } } },
  });

  return NextResponse.json({ classes });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "lessons.edit"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: (e as Error).message }, { status: 403 }); throw e; }

  const parsed = CreateClassSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { courseId, blockId, title, description, scheduledAt, durationMin, joinUrl, platform } = parsed.data;

  const liveClass = await db.liveClass.create({
    data: {
      courseId,
      blockId: blockId ?? null,
      tutorId: session.user.id,
      title,
      description: description ?? null,
      scheduledAt: new Date(scheduledAt),
      durationMin,
      joinUrl,
      platform,
      status: "SCHEDULED",
    },
    include: { course: { select: { title: true } } },
  });

  return NextResponse.json(liveClass, { status: 201 });
}
