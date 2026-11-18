import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  groups: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      members: z.array(z.string()),
    }),
  ),
});

/**
 * GET /api/principal/intakes/[intakeId]/groups
 * Load existing breakaway groups for an intake
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { intakeId: string } },
) {
  try {
    const session = await auth();
    if (!session?.user || !can(session.user.role, "courses.view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const groups = await db.intakeGroup.findMany({
      where: { intakeId: params.intakeId },
      include: {
        members: {
          select: { userId: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const formatted = groups.map((g) => ({
      id: g.id,
      name: g.name,
      members: g.members.map((m) => m.userId),
    }));

    return NextResponse.json({ groups: formatted });
  } catch (error) {
    console.error("Failed to load groups:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/principal/intakes/[intakeId]/groups
 * Save breakaway groups for an intake
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { intakeId: string } },
) {
  try {
    const session = await auth();
    if (!session?.user || !can(session.user.role, "courses.edit")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = schema.parse(body);

    // Verify intake exists
    const intake = await db.intake.findUnique({
      where: { id: params.intakeId },
      select: { id: true, label: true, courseId: true },
    });

    if (!intake) {
      return NextResponse.json({ error: "Intake not found" }, { status: 404 });
    }

    // Delete existing groups for this intake
    await db.intakeGroup.deleteMany({
      where: { intakeId: params.intakeId },
    });

    // Create new groups with members
    for (const group of data.groups) {
      await db.intakeGroup.create({
        data: {
          intakeId: params.intakeId,
          name: group.name,
          members: {
            create: group.members.map((userId) => ({
              userId,
            })),
          },
        },
      });
    }

    await audit({
      actor: session.user,
      action: "UPDATE",
      resource: "intake_groups",
      resourceId: params.intakeId,
      details: {
        intakeId: params.intakeId,
        intakeLabel: intake.label,
        groupCount: data.groups.length,
        totalMembers: data.groups.reduce((sum, g) => sum + g.members.length, 0),
        groups: data.groups.map((g) => ({
          name: g.name,
          memberCount: g.members.length,
        })),
      },
    });

    return NextResponse.json({ success: true, groups: data.groups });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.errors },
        { status: 400 },
      );
    }
    console.error("Failed to save groups:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
