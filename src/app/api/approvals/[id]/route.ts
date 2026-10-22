import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, assertNotSelfApproval, ForbiddenError, can, getDelegationSettings, canDeputyWithDelegation } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

const DecideSchema = z.object({
  decision:    z.enum(["APPROVED", "REJECTED"]),
  decisionNote: z.string().min(5).max(2000),
});

/** GET /api/approvals/[id] - view a single request (SUPERADMIN or initiator) */
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

  // Only SUPERADMIN, the initiator, or PRINCIPAL (for MARKS_CHANGE) can view
  const isSuperAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "SUPERADMIN";
  const isInitiator  = request.initiatorId === session.user.id;
  const isPrincipal  = session.user.role === "PRINCIPAL";
  if (!isSuperAdmin && !isInitiator && !isPrincipal) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ request });
}

/** PATCH /api/approvals/[id] - decide on a request */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = DecideSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const request = await db.approvalRequest.findUnique({ where: { id: params.id } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Request already decided." }, { status: 409 });
  }

  const { role } = session.user;

  // Different approval types have different approvers:
  //   MARKS_CHANGE   -> PRINCIPAL (or DEPUTY when delegated), or SUPER_ADMIN
  //   everything else -> SUPER_ADMIN (approvals.decide)
  if (request.type === "MARKS_CHANGE") {
    const hasDirect = can(role, "marks.change.approve");
    let hasViaDelegate = false;
    if (role === "DEPUTY_PRINCIPAL") {
      const delegationSettings = await getDelegationSettings(db);
      hasViaDelegate = canDeputyWithDelegation("marks.change.approve", delegationSettings);
    }
    if (!hasDirect && !hasViaDelegate) {
      return NextResponse.json({ error: "Only the Principal (or delegated Deputy) may approve marks changes." }, { status: 403 });
    }
  } else {
    try {
      requirePermission(role, "approvals.decide");
    } catch (e) {
      if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
      throw e;
    }
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

  // If a MARKS_CHANGE request was approved, apply the grade update
  if (request.type === "MARKS_CHANGE" && parsed.data.decision === "APPROVED" && request.gradeEntryId) {
    const entry = await db.gradeEntry.findUnique({ where: { id: request.gradeEntryId } });
    if (entry && request.proposedScore !== null && request.proposedScore !== undefined) {
      const newScore    = request.proposedScore;
      const maxScore    = entry.maxScore ?? 100;
      const percentage  = maxScore > 0 ? (newScore / maxScore) * 100 : 0;
      await db.gradeEntry.update({
        where: { id: request.gradeEntryId },
        data: {
          score:           newScore,
          percentage,
          changeReason:    request.reason,
          changeApprovalId: request.id,
          updatedAt:       new Date(),
        },
      });
      await audit({
        actorId:    session.user.id,
        action:     "GRADE_CHANGE_APPROVED",
        entityType: "GradeEntry",
        entityId:   request.gradeEntryId,
        metadata:   {
          approvalId:   request.id,
          newScore,
          reason:       request.reason,
          via:          role === "DEPUTY_PRINCIPAL" ? "delegation" : role,
        },
        ip: req.headers.get("x-forwarded-for") ?? undefined,
      });
    }
  }

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
