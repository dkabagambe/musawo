import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";

const CreateSchema = z.object({
  courseId: z.string().cuid(),
  label: z.string().min(3).max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  seats: z.number().int().min(1).max(500),
  isOpen: z.boolean(),
});

const UpdateSchema = z.object({
  id: z.string().cuid(),
  label: z.string().min(3).max(100).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  seats: z.number().int().min(1).max(500).optional(),
  isOpen: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.edit"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );

  const { courseId, label, startDate, endDate, seats, isOpen } = parsed.data;

  // Verify course exists
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true },
  });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  // Validate date range
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end <= start)
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });

  const intake = await db.intake.create({
    data: {
      courseId,
      label,
      startDate: start,
      endDate: end,
      seats,
      isOpen,
    },
  });

  await audit({
    actor: session.user,
    action: "CREATE",
    resource: "intake",
    resourceId: intake.id,
    details: { courseTitle: course.title, label, startDate, endDate },
  });

  return NextResponse.json({ intake });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.edit"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = UpdateSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );

  const { id, label, startDate, endDate, seats, isOpen } = parsed.data;

  const existing = await db.intake.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (label !== undefined) updateData.label = label;
  if (startDate !== undefined) updateData.startDate = new Date(startDate);
  if (endDate !== undefined) updateData.endDate = new Date(endDate);
  if (seats !== undefined) updateData.seats = seats;
  if (isOpen !== undefined) updateData.isOpen = isOpen;

  // Validate date range if both dates are being updated
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start)
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 },
      );
  }

  const intake = await db.intake.update({
    where: { id },
    data: updateData,
  });

  await audit({
    actor: session.user,
    action: isOpen === false ? "CLOSE" : "UPDATE",
    resource: "intake",
    resourceId: id,
    details: updateData,
  });

  return NextResponse.json({ intake });
}
