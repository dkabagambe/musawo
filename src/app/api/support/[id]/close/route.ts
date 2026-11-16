/**
 * POST /api/support/[id]/close
 * Ticket owner can close their own ticket (marks as CLOSED).
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";

export async function POST(
  _req: NextRequest,
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

  if (ticket.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (ticket.status === "CLOSED")
    return NextResponse.json({ error: "Ticket already closed" }, { status: 400 });

  await db.supportTicket.update({
    where: { id: ticket.id },
    data: { status: "CLOSED", resolvedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
