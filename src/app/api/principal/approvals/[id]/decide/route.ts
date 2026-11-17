import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { z } from "zod";

const DecisionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "FORWARD", "REQUEST_INFO", "SEND_BACK", "RETURN", "CONFIRM"]),
  note: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || !can(session.user.role, "content.approve")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = DecisionSchema.parse(body);

    const request = await db.approvalRequest.findUnique({
      where: { id: params.id },
      include: {
        initiator: { select: { id: true, name: true, email: true } },
        student: { select: { id: true, email: true, name: true } },
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Check if already decided
    if (request.decidedById) {
      return NextResponse.json(
        { error: "This request has already been decided" },
        { status: 400 }
      );
    }

    // Handle different actions
    switch (data.action) {
      case "APPROVE":
        // Principal approves (final decision for some types)
        await handleApprove(request, session.user.id, data.note);
        break;

      case "REJECT":
        // Principal rejects
        await handleReject(request, session.user.id, data.note || "Rejected by Principal");
        break;

      case "FORWARD":
      case "REQUEST_INFO":
        // Principal forwards to Director
        await handleForward(request, session.user.id, data.note);
        break;

      case "SEND_BACK":
      case "RETURN":
        // Principal sends back to originator
        await handleReturn(request, session.user.id, data.note || "Returned for revision");
        break;

      case "CONFIRM":
        // Principal confirms (e.g., storage clearing)
        await handleConfirm(request, session.user.id, data.note);
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Approval decision error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleApprove(request: any, principalId: string, note?: string) {
  // Types where Principal is final approver: ADMISSION, MARKS_CHANGE, EQUIPMENT_REQUEST (optional)
  const finalApprovalTypes = ["ADMISSION", "MARKS_CHANGE"];
  const isFinal = finalApprovalTypes.includes(request.type);

  if (isFinal) {
    // Apply the approval immediately
    await db.approvalRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        decidedById: principalId,
        decidedAt: new Date(),
        decisionNote: note || "Approved by Principal",
      },
    });

    // For admissions, activate the student account and send email
    if (request.type === "ADMISSION" && request.studentId) {
      await db.user.update({
        where: { id: request.studentId },
        data: { status: "ACTIVE" },
      });

      // TODO: Send email with set-password link
      // TODO: Notify Admin
    }

    // TODO: Audit log entry
  } else {
    // For types that need Director approval, forward it
    await handleForward(request, principalId, note || "Approved and forwarded to Director");
  }
}

async function handleReject(request: any, principalId: string, note: string) {
  await db.approvalRequest.update({
    where: { id: request.id },
    data: {
      status: "REJECTED",
      decidedById: principalId,
      decidedAt: new Date(),
      decisionNote: note,
    },
  });

  // TODO: Notify initiator
  // TODO: Audit log entry
}

async function handleForward(request: any, principalId: string, note?: string) {
  await db.approvalRequest.update({
    where: { id: request.id },
    data: {
      status: "IN_REVIEW",
      reviewerId: principalId,
      reviewedAt: new Date(),
      reviewNote: note || "Forwarded to Director for decision",
    },
  });

  // TODO: Notify Director
  // TODO: Audit log entry
}

async function handleReturn(request: any, principalId: string, note: string) {
  await db.approvalRequest.update({
    where: { id: request.id },
    data: {
      status: "DRAFT", // Return to draft so initiator can revise
      reviewerId: principalId,
      reviewedAt: new Date(),
      reviewNote: note,
    },
  });

  // TODO: Notify initiator
  // TODO: Audit log entry
}

async function handleConfirm(request: any, principalId: string, note?: string) {
  // Similar to approve for types like STORAGE_CLEARING
  await db.approvalRequest.update({
    where: { id: request.id },
    data: {
      status: "APPROVED",
      decidedById: principalId,
      decidedAt: new Date(),
      decisionNote: note || "Confirmed by Principal",
    },
  });

  // TODO: Notify Director (for storage clearing)
  // TODO: Audit log entry
}
