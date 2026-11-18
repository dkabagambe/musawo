import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
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
 * POST /api/principal/classes/[intakeId]/groups
 * Save breakaway groups for an intake
 * 
 * Note: This is a simplified implementation that stores group data in audit logs.
 * For full functionality, a proper IntakeGroup and IntakeGroupMember model should be added.
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

    // For now, just log the group configuration
    // In a full implementation, this would create IntakeGroup and IntakeGroupMember records
    await auditLog({
      action: "UPDATE",
      resource: "intake_groups",
      resourceId: params.intakeId,
      userId: session.user.id,
      details: {
        intakeId: params.intakeId,
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
