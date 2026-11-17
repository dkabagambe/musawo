import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";

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

    const body = await req.json() as { comment?: string };
    const proofId = params.id;

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

    // Forward to Director (set status to IN_REVIEW, set reviewerId)
    await db.approvalRequest.update({
      where: { id: proofId },
      data: {
        status: "IN_REVIEW",
        reviewerId: session.user.id,
        reviewerComment: body.comment?.trim() || null,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Audit log
    await auditLog({
      action: "APPROVAL_FORWARDED",
      actorId: session.user.id,
      entityType: "approval_request",
      entityId: approval.id,
      details: {
        type: "PAYMENT_PROOF",
        forwardedToDirector: true,
        comment: body.comment?.trim(),
        initiator: approval.initiator.name,
      },
      ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "",
    });

    // TODO: Notify Director
    // await sendNotification({
    //   role: "DIRECTOR",
    //   title: "Payment Proof Forwarded",
    //   body: `Principal forwarded a payment proof for your approval.`,
    // });

    return NextResponse.json({
      success: true,
      message: "Payment proof forwarded to Director",
    });
  } catch (error) {
    console.error("Error forwarding payment proof:", error);
    return NextResponse.json(
      { error: "Failed to forward payment proof" },
      { status: 500 }
    );
  }
}
