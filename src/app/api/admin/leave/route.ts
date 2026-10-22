import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, canVia, assertNotSelfApproval } from "@/lib/rbac";
import { audit } from "@/lib/audit";

const DecisionSchema = z.object({
  requestId: z.string().cuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().max(1000).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "staff.leave.manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const requests = await db.leaveRequest.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      decidedBy: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { startsAt: "asc" }],
    take: 100,
  });
  return NextResponse.json({ requests });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "staff.leave.manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = DecisionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const request = await db.leaveRequest.findUnique({
    where: { id: parsed.data.requestId },
  });
  if (!request)
    return NextResponse.json(
      { error: "Leave request not found" },
      { status: 404 },
    );
  if (request.status !== "PENDING")
    return NextResponse.json(
      { error: "This request has already been decided" },
      { status: 409 },
    );
  try {
    assertNotSelfApproval(request.userId, session.user.id);
  } catch {
    return NextResponse.json(
      { error: "You cannot decide your own request" },
      { status: 403 },
    );
  }

  const updated = await db.leaveRequest.update({
    where: { id: request.id },
    data: {
      status: parsed.data.decision,
      decidedById: session.user.id,
      decidedAt: new Date(),
      decisionNote: parsed.data.note,
    },
  });
  await db.notification.create({
    data: {
      userId: request.userId,
      channel: "IN_APP",
      type: "LEAVE_REQUEST_DECIDED",
      subject: `Leave request ${parsed.data.decision.toLowerCase()}`,
      body:
        parsed.data.note ??
        `Your leave request was ${parsed.data.decision.toLowerCase()}.`,
      metadata: { requestId: request.id },
    },
  });
  await audit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "LeaveRequest",
    entityId: request.id,
    metadata: {
      decision: parsed.data.decision,
      requesterId: request.userId,
      via: canVia(session.user.role, "staff.leave.manage"),
    },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });
  return NextResponse.json({ request: updated });
}
