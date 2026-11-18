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

    const body = await req.json() as { comment: string };
    const ticketId = params.id;

    if (!body.comment || body.comment.trim().length < 3) {
      return NextResponse.json(
        { error: "Comment required (minimum 3 characters)" },
        { status: 400 }
      );
    }

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

    // Add reply
    const reply = await db.supportReply.create({
      data: {
        ticketId,
        userId: session.user.id,
        body: body.comment.trim(),
        isStaff: true,
        createdAt: new Date(),
      },
    });

    // Audit log
    await auditLog({
      action: "SUPPORT_TICKET_REPLIED",
      actorId: session.user.id,
      entityType: "support_ticket",
      entityId: ticket.id,
      details: {
        ticketSubject: ticket.subject,
        ticketUser: ticket.user.name,
        replyBy: session.user.name,
        commentLength: body.comment.trim().length,
      },
      ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "",
    });

    // TODO: Notify ticket owner and assigned IT Admin
    // await sendNotification({
    //   userId: ticket.userId,
    //   title: "New Comment on Your Ticket",
    //   body: `${session.user.name} commented on your ticket: ${ticket.subject}`,
    // });

    return NextResponse.json({
      success: true,
      message: "Comment added successfully",
      reply: {
        id: reply.id,
        body: reply.body,
        createdAt: reply.createdAt,
      },
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}
