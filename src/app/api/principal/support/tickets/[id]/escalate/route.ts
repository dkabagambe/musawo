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
    if (!session?.user || !can(session.user.role, "support.view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as { reason?: string };
    const ticketId = params.id;

    // Get the ticket
    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.status === "CLOSED" || ticket.status === "RESOLVED") {
      return NextResponse.json(
        { error: "Cannot escalate a closed or resolved ticket" },
        { status: 400 }
      );
    }

    // Update ticket priority to HIGH
    await db.supportTicket.update({
      where: { id: ticketId },
      data: {
        priority: "HIGH",
        updatedAt: new Date(),
      },
    });

    // Add a reply noting the escalation
    await db.supportReply.create({
      data: {
        ticketId,
        userId: session.user.id,
        body: `🔺 ESCALATED by ${session.user.name}\n${body.reason ? `Reason: ${body.reason}` : ""}`,
        isStaff: true,
        createdAt: new Date(),
      },
    });

    // Audit log
    await auditLog({
      action: "UPDATE",
      actorId: session.user.id,
      entityType: "support_ticket",
      entityId: ticket.id,
      details: {
        action: "escalated",
        ticketSubject: ticket.subject,
        ticketUser: ticket.user.name,
        reason: body.reason?.trim(),
        priorityChanged: "HIGH",
        escalatedBy: session.user.name,
      },
      ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "",
    });

    // TODO: Notify IT Admin immediately
    // await sendNotification({
    //   role: "SYSTEM_IT",
    //   title: "Ticket Escalated by Principal",
    //   body: `Ticket #${ticket.id} escalated to HIGH priority`,
    //   priority: "HIGH",
    // });

    return NextResponse.json({
      success: true,
      message: "Ticket escalated to HIGH priority",
    });
  } catch (error) {
    console.error("Error escalating ticket:", error);
    return NextResponse.json(
      { error: "Failed to escalate ticket" },
      { status: 500 }
    );
  }
}
