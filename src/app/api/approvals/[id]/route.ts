import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, assertNotSelfApproval, ForbiddenError } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

const DecideSchema = z.object({
  decision:    z.enum(["APPROVED", "REJECTED"]),
  decisionNote: z.string().min(5).max(2000),
});

/** GET /api/approvals/[id] — view a single request (SUPERADMIN or initiator) */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const request = await db.approvalRequest.findUnique({
    where: { id: params.id },
    include: {
      initiator: { select: { name: true, role: true, email: true } },
      decidedBy: { select: { name: true } },
    },
  });

  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only SUPERADMIN or the initiator can view
  const isSuperAdmin = session.user.role === "SUPERADMIN";
  const isInitiator  = request.initiatorId === session.user.id;
  if (!isSuperAdmin && !isInitiator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ request });
}

/** PATCH /api/approvals/[id] — decide (SUPERADMIN only, cannot be initiator) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    requirePermission(session.user.role, "approvals.decide");
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }

  const parsed = DecideSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const request = await db.approvalRequest.findUnique({ where: { id: params.id } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Request already decided." }, { status: 409 });
  }

  // Separation of duties
  try {
    assertNotSelfApproval(request.initiatorId, session.user.id);
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }

  const updated = await db.approvalRequest.update({
    where: { id: params.id },
    data: {
      status:       parsed.data.decision,
      decidedById:  session.user.id,
      decidedAt:    new Date(),
      decisionNote: parsed.data.decisionNote,
    },
  });

  await audit({
    actorId:    session.user.id,
    action:     parsed.data.decision === "APPROVED" ? "APPROVAL_APPROVED" : "APPROVAL_REJECTED",
    entityType: "ApprovalRequest",
    entityId:   params.id,
    metadata:   { type: request.type, note: parsed.data.decisionNote },
    ip:         req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ request: updated });
}
