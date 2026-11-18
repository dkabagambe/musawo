import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
  headId: z.string().cuid().optional().nullable(),
});

const UpdateSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  headId: z.string().cuid().optional().nullable(),
  isActive: z.boolean().optional(),
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

  const { name, description, headId } = parsed.data;

  // Check if head exists and is INSTRUCTOR or PRINCIPAL
  if (headId) {
    const head = await db.user.findFirst({
      where: { id: headId, role: { in: ["INSTRUCTOR", "PRINCIPAL"] }, status: "ACTIVE" },
    });
    if (!head)
      return NextResponse.json(
        { error: "Head must be an active Instructor or Principal" },
        { status: 400 },
      );
  }

  const dept = await db.department.create({
    data: {
      name,
      description,
      headId,
      isActive: true,
    },
  });

  await audit({
    actor: session.user,
    action: "CREATE",
    resource: "department",
    resourceId: dept.id,
    details: { name },
  });

  return NextResponse.json({ department: dept });
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

  const { id, name, description, headId, isActive } = parsed.data;

  const existing = await db.department.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check if head exists and is INSTRUCTOR or PRINCIPAL
  if (headId) {
    const head = await db.user.findFirst({
      where: { id: headId, role: { in: ["INSTRUCTOR", "PRINCIPAL"] }, status: "ACTIVE" },
    });
    if (!head)
      return NextResponse.json(
        { error: "Head must be an active Instructor or Principal" },
        { status: 400 },
      );
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (headId !== undefined) updateData.headId = headId;
  if (isActive !== undefined) updateData.isActive = isActive;

  const dept = await db.department.update({
    where: { id },
    data: updateData,
  });

  await audit({
    actor: session.user,
    action: isActive === false ? "ARCHIVE" : "UPDATE",
    resource: "department",
    resourceId: id,
    details: updateData,
  });

  return NextResponse.json({ department: dept });
}
