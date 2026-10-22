import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { can, canVia } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { getSetting } from "@/lib/settings";
import { z } from "zod";

const CreateTicketSchema = z.object({
  subject: z.string().min(3).max(200),
  body: z.string().min(10).max(3000),
  category: z.string().min(2).max(60).optional(),
});

const UpdateTicketSchema = z.object({
  action: z.enum(["assign", "reply", "status"]),
  assignedTo: z
    .union([z.string().cuid(), z.literal("me")])
    .nullable()
    .optional(),
  body: z.string().min(2).max(3000).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
});

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const manager = can(session.user.role, "support.manage");
  if (!manager && !can(session.user.role, "support.submit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tickets = await db.supportTicket.findMany({
    where: manager ? {} : { userId: session.user.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } } },
      },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
  });
  return NextResponse.json({ tickets, viewerId: session.user.id });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "support.submit"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = CreateTicketSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const categories = (
    await getSetting(
      "support.ticketCategories",
      "GENERAL,ACADEMIC,TECHNICAL,ENROLMENT,OTHER",
    )
  )
    .split(",")
    .map((category) => category.trim())
    .filter(Boolean);
  const category = parsed.data.category ?? "GENERAL";
  if (!categories.includes(category))
    return NextResponse.json(
      { error: "Unknown ticket category" },
      { status: 400 },
    );

  const ticket = await db.supportTicket.create({
    data: {
      userId: session.user.id,
      subject: parsed.data.subject,
      body: parsed.data.body,
      category,
    },
  });

  const activeUsers = await db.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, role: true, email: true, name: true },
  });
  const managers = activeUsers.filter((user) =>
    can(user.role, "support.manage"),
  );
  await db.notification.createMany({
    data: managers.map((manager) => ({
      userId: manager.id,
      channel: "IN_APP" as const,
      type: "SUPPORT_TICKET_CREATED",
      subject: `Support ticket: ${parsed.data.subject}`,
      body: `${category} ticket submitted by ${session.user.name ?? "a user"}.`,
      metadata: { ticketId: ticket.id },
    })),
  });
  await Promise.all(
    managers
      .filter((manager) => manager.email)
      .map((manager) =>
        sendEmail({
          to: manager.email!,
          subject: `New support ticket: ${parsed.data.subject}`,
          template: "support-ticket-created",
          variables: {
            ticketTitle: escapeHtml(parsed.data.subject),
            category: escapeHtml(category),
            requester: escapeHtml(session.user.name ?? "A user"),
            ticketUrl: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/admin/support`,
          },
        }),
      ),
  );
  await audit({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "SupportTicket",
    entityId: ticket.id,
    metadata: { category, via: canVia(session.user.role, "support.submit") },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ id: ticket.id }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "support.manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateTicketSchema.safeParse(body);
  if (!parsed.success || !body || typeof body.ticketId !== "string") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const ticket = await db.supportTicket.findUnique({
    where: { id: body.ticketId },
  });
  if (!ticket)
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  if (parsed.data.action === "reply") {
    if (!parsed.data.body)
      return NextResponse.json({ error: "Reply is required" }, { status: 400 });
    await db.supportReply.create({
      data: {
        ticketId: ticket.id,
        authorId: session.user.id,
        body: parsed.data.body,
        isStaff: true,
      },
    });
    await db.supportTicket.update({
      where: { id: ticket.id },
      data: { status: "IN_PROGRESS" },
    });
    await db.notification.create({
      data: {
        userId: ticket.userId,
        channel: "IN_APP",
        type: "SUPPORT_TICKET_REPLY",
        subject: `Reply to ${ticket.subject}`,
        body: parsed.data.body,
        metadata: { ticketId: ticket.id },
      },
    });
    const requester = await db.user.findUnique({
      where: { id: ticket.userId },
      select: { name: true, email: true },
    });
    if (requester?.email) {
      await sendEmail({
        to: requester.email,
        subject: `Reply to your support ticket: ${ticket.subject}`,
        template: "support-reply",
        variables: {
          name: escapeHtml(requester.name),
          ticketTitle: escapeHtml(ticket.subject),
          reply: escapeHtml(parsed.data.body).replaceAll("\n", "<br />"),
          ticketUrl: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/dashboard/support`,
        },
      });
    }
    await audit({
      actorId: session.user.id,
      action: "SUPPORT_TICKET_REPLIED",
      entityType: "SupportTicket",
      entityId: ticket.id,
      metadata: { via: canVia(session.user.role, "support.manage") },
    });
  } else if (parsed.data.action === "assign") {
    const assigneeId =
      parsed.data.assignedTo === "me"
        ? session.user.id
        : (parsed.data.assignedTo ?? null);
    if (assigneeId) {
      const assignee = await db.user.findUnique({
        where: { id: assigneeId },
        select: { role: true },
      });
      if (!assignee || !can(assignee.role, "support.manage")) {
        return NextResponse.json(
          { error: "Assignee cannot manage support tickets" },
          { status: 400 },
        );
      }
    }
    await db.supportTicket.update({
      where: { id: ticket.id },
      data: { assignedTo: assigneeId, status: "IN_PROGRESS" },
    });
    await audit({
      actorId: session.user.id,
      action: "UPDATE",
      entityType: "SupportTicket",
      entityId: ticket.id,
      metadata: {
        action: "assigned",
        assigneeId,
        via: canVia(session.user.role, "support.manage"),
      },
    });
  } else {
    if (!parsed.data.status)
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 },
      );
    await db.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: parsed.data.status,
        resolvedAt: ["RESOLVED", "CLOSED"].includes(parsed.data.status)
          ? new Date()
          : null,
      },
    });
    await audit({
      actorId: session.user.id,
      action: "UPDATE",
      entityType: "SupportTicket",
      entityId: ticket.id,
      metadata: {
        status: parsed.data.status,
        via: canVia(session.user.role, "support.manage"),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
