import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || !can(session.user.role, "approvals.review")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as { reason: string };
    const proofId = params.id;

    if (!body.reason || body.reason.trim().length < 10) {
      return NextResponse.json(
        { error: "Reason required (minimum 10 characters)" },
        { status: 400 }
      );
    }

    // Get the approval request
    const approval = await db.approvalRequest.findUnique({
      where: { id: proofId },
      include: {
        initiator: { select: { name: true, email: true } },
      },
    });

    if (!approval) {
      return NextResponse.json({ error: "Payment proof not found" }, { status: 404 });
    }

    if (approval.type !== "PAYMENT_PROOF") {
      return NextResponse.json({ error: "Not a payment proof" }, { status: 400 });
    }

    if (!["SUBMITTED", "IN_REVIEW"].includes(approval.status)) {
      return NextResponse.json(
        { error: "Payment proof already processed" },
        { status: 400 }
      );
    }

    // Cannot approve own submission
    if (approval.initiatorId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot review your own submission" },
        { status: 403 }
      );
    }

    // Return to Admin (reject with reason)
    await db.approvalRequest.update({
      where: { id: proofId },
      data: {
        status: "REJECTED",
        decidedBy: session.user.id,
        decisionComment: body.reason.trim(),
        decidedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Audit log
    await auditLog({
      action: "APPROVAL_REJECTED",
      actorId: session.user.id,
      entityType: "approval_request",
      entityId: approval.id,
      details: {
        type: "PAYMENT_PROOF",
        returnedToAdmin: true,
        reason: body.reason.trim(),
        initiator: approval.initiator.name,
      },
      ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "",
    });

    // TODO: Notify Admin
    // await sendNotification({
    //   userId: approval.initiatorId,
    //   title: "Payment Proof Returned",
    //   body: `Principal returned your payment proof submission. Reason: ${body.reason}`,
    // });

    return NextResponse.json({
      success: true,
      message: "Payment proof returned to Admin",
    });
  } catch (error) {
    console.error("Error returning payment proof:", error);
    return NextResponse.json(
      { error: "Failed to return payment proof" },
      { status: 500 }
    );
  }
}
