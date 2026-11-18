import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";

const CreateSchema = z.object({
  courseId: z.string().cuid(),
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional().nullable(),
  order: z.number().int().positive(),
  prerequisiteBlockOrder: z.number().int().positive().optional().nullable(),
});

const UpdateSchema = z.object({
  blockId: z.string().cuid(),
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  prerequisiteBlockOrder: z.number().int().positive().optional().nullable(),
});

const DeleteSchema = z.object({
  blockId: z.string().cuid(),
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

  const { courseId, title, description, order, prerequisiteBlockOrder } = parsed.data;

  // Check if prerequisite block exists
  if (prerequisiteBlockOrder) {
    const prereq = await db.block.findFirst({
      where: { courseId, order: prerequisiteBlockOrder },
    });
    if (!prereq)
      return NextResponse.json(
        { error: `Block ${prerequisiteBlockOrder} does not exist` },
        { status: 400 },
      );
  }

  const block = await db.block.create({
    data: {
      courseId,
      title,
      description,
      order,
      prerequisiteBlockOrder,
    },
  });

  await audit({
    actor: session.user,
    action: "CREATE",
    resource: "course_block",
    resourceId: block.id,
    details: { courseId, title, order },
  });

  return NextResponse.json({ block });
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

  const { blockId, title, description, prerequisiteBlockOrder } = parsed.data;

  const existing = await db.block.findUnique({ where: { id: blockId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check if prerequisite block exists
  if (prerequisiteBlockOrder) {
    const prereq = await db.block.findFirst({
      where: { courseId: existing.courseId, order: prerequisiteBlockOrder },
    });
    if (!prereq)
      return NextResponse.json(
        { error: `Block ${prerequisiteBlockOrder} does not exist` },
        { status: 400 },
      );
  }

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (prerequisiteBlockOrder !== undefined)
    updateData.prerequisiteBlockOrder = prerequisiteBlockOrder;

  const block = await db.block.update({
    where: { id: blockId },
    data: updateData,
  });

  await audit({
    actor: session.user,
    action: "UPDATE",
    resource: "course_block",
    resourceId: blockId,
    details: updateData,
  });

  return NextResponse.json({ block });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.edit"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = DeleteSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );

  const { blockId } = parsed.data;

  const existing = await db.block.findUnique({
    where: { id: blockId },
    include: { _count: { select: { lessons: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete the block (cascade will delete lessons)
  await db.block.delete({ where: { id: blockId } });

  await audit({
    actor: session.user,
    action: "DELETE",
    resource: "course_block",
    resourceId: blockId,
    details: { title: existing.title, lessonCount: existing._count.lessons },
  });

  return NextResponse.json({ success: true });
}
