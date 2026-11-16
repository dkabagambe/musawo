/**
 * POST /api/support/[id]/reply
 * Ticket owner adds a reply to their own ticket.
 * Staff replies are handled via PATCH /api/support (action: reply).
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";

const ReplySchema = z.object({
  body: z.string().min(2).max(3000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ticket = await db.supportTicket.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, status: true },
  });
  if (!ticket)
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  // Only the owner can reply via this endpoint
  if (ticket.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (ticket.status === "CLOSED" || ticket.status === "RESOLVED")
    return NextResponse.json({ error: "Ticket is closed" }, { status: 400 });

  const parsed = ReplySchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const reply = await db.supportReply.create({
    data: {
      ticketId: ticket.id,
      authorId: session.user.id,
      body: parsed.data.body,
      isStaff: false,
    },
  });

  // Set ticket back to OPEN so managers see activity
  await db.supportTicket.update({
    where: { id: ticket.id },
    data: { status: "OPEN", updatedAt: new Date() },
  });

  // Notify IT Admin / support managers so they know the student replied
  const managers = await db.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, role: true },
  });
  const supportManagers = managers.filter((u) => can(u.role as import("@prisma/client").UserRole, "support.manage"));
  if (supportManagers.length > 0) {
    await db.notification.createMany({
      data: supportManagers.map((m) => ({
        userId: m.id,
        channel: "IN_APP" as const,
        type: "SUPPORT_TICKET_CREATED",
        subject: `Student replied on ticket`,
        body: parsed.data.body.slice(0, 200),
        metadata: { ticketId: ticket.id },
      })),
    });
  }

  return NextResponse.json({ reply }, { status: 201 });
}
