import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { can, canVia } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { getSetting } from "@/lib/settings";
import { getPresignedUploadUrl } from "@/lib/s3";
import { z } from "zod";

const CreateTicketSchema = z.object({
  subject: z.string().min(3).max(200),
  body: z.string().min(10).max(3000),
  category: z.string().min(2).max(60).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
});

const UpdateTicketSchema = z.object({
  action: z.enum(["assign", "reply", "status", "priority", "close"]),
  assignedTo: z
    .union([z.string().cuid(), z.literal("me")])
    .nullable()
    .optional(),
  body: z.string().min(2).max(3000).optional(),
  isInternal: z.boolean().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  resolutionSummary: z.string().min(5).max(1000).optional(),
});

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isManager = can(session.user.role, "support.manage");
  if (!isManager && !can(session.user.role, "support.submit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);

  // Filters (manager only)
  const statusFilter = searchParams.get("status");
  const categoryFilter = searchParams.get("category");
  const priorityFilter = searchParams.get("priority");
  const assigneeFilter = searchParams.get("assignee"); // "me", "unassigned", or a user id
  const search = searchParams.get("search")?.trim();
  const sortBy = searchParams.get("sort") ?? "newest"; // newest | oldest | priority | updated
  const pageStr = searchParams.get("page");
  const page = pageStr ? Math.max(1, parseInt(pageStr, 10)) : 1;
  const pageSize = 20;

  type WhereClause = Record<string, unknown>;
  const where: WhereClause = isManager ? {} : { userId: session.user.id };

  if (isManager) {
    if (statusFilter && statusFilter !== "ALL") {
      if (statusFilter === "OPEN_ACTIVE") {
        where["status"] = { in: ["OPEN", "IN_PROGRESS"] };
      } else {
        where["status"] = statusFilter;
      }
    }
    if (categoryFilter && categoryFilter !== "ALL") where["category"] = categoryFilter;
    if (priorityFilter && priorityFilter !== "ALL") where["priority"] = priorityFilter;
    if (assigneeFilter === "unassigned") where["assignedTo"] = null;
    else if (assigneeFilter === "me") where["assignedTo"] = session.user.id;
    else if (assigneeFilter) where["assignedTo"] = assigneeFilter;
    if (search) {
      where["OR"] = [
        { subject: { contains: search, mode: "insensitive" } },
        { body: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }
  }

  type OrderBy = Record<string, unknown>;
  const orderBy: OrderBy[] =
    sortBy === "oldest"
      ? [{ createdAt: "asc" }]
      : sortBy === "priority"
        ? [{ priority: "asc" }, { createdAt: "asc" }]
        : sortBy === "updated"
          ? [{ updatedAt: "desc" }]
          : [{ createdAt: "desc" }];

  const [total, tickets] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db.supportTicket.count({ where: where as any }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db.supportTicket.findMany({
      where: where as any,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        assignee: { select: { id: true, name: true } },
        replies: {
          where: isManager ? {} : { isInternal: false },
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, name: true } } },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orderBy: orderBy as any,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // Compute SLA status for each ticket
  const slaHours = parseInt(await getSetting("support.slaFirstResponseHours", "4"), 10);
  const slaMinutes = slaHours * 60;

  const ticketsWithSla = tickets.map((t) => {
    const ageMinutes = (Date.now() - new Date(t.createdAt).getTime()) / 60000;
    const targetMinutes = t.firstResponseTargetMinutes ?? slaMinutes;
    const responded = !!t.firstResponseAt;
    let slaStatus: "ok" | "warning" | "overdue" | "met" = "ok";
    if (responded) {
      slaStatus = "met";
    } else if (ageMinutes >= targetMinutes) {
      slaStatus = "overdue";
    } else if (ageMinutes >= targetMinutes * 0.5) {
      slaStatus = "warning";
    }
    const timeRemainingMinutes = responded ? null : Math.round(targetMinutes - ageMinutes);
    return { ...t, slaStatus, timeRemainingMinutes };
  });

  return NextResponse.json({
    tickets: ticketsWithSla,
    viewerId: session.user.id,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
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

  // Read SLA setting and stamp on creation
  const slaHours = parseInt(await getSetting("support.slaFirstResponseHours", "4"), 10);
  const slaMinutes = slaHours * 60;

  const ticket = await db.supportTicket.create({
    data: {
      userId: session.user.id,
      subject: parsed.data.subject,
      body: parsed.data.body,
      category,
      priority: parsed.data.priority ?? "NORMAL",
      firstResponseTargetMinutes: slaMinutes,
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
            ticketUrl: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/system/support`,
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

  // Generate presigned S3 URL for optional attachment
  let uploadUrl: string | null = null;
  let s3Key: string | null = null;
  try {
    s3Key = `support-tickets/${session.user.id}/${ticket.id}/attachment`;
    uploadUrl = await getPresignedUploadUrl(s3Key, "application/octet-stream", 900);
    await db.supportTicket.update({ where: { id: ticket.id }, data: { fileS3Key: s3Key } });
  } catch {
    uploadUrl = null;
    s3Key = null;
  }

  return NextResponse.json({ id: ticket.id, uploadUrl, s3Key }, { status: 201 });
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
      return NextResponse.json({ error: "Reply body is required" }, { status: 400 });
    const isInternal = parsed.data.isInternal ?? false;
    await db.supportReply.create({
      data: {
        ticketId: ticket.id,
        authorId: session.user.id,
        body: parsed.data.body,
        isStaff: true,
        isInternal,
      },
    });

    // Set firstResponseAt if this is the first staff reply (and not internal)
    if (!ticket.firstResponseAt && !isInternal) {
      await db.supportTicket.update({
        where: { id: ticket.id },
        data: { status: "IN_PROGRESS", firstResponseAt: new Date() },
      });
    } else {
      await db.supportTicket.update({
        where: { id: ticket.id },
        data: { status: "IN_PROGRESS" },
      });
    }

    // Only notify the user for non-internal replies
    if (!isInternal) {
      await db.notification.create({
        data: {
          userId: ticket.userId,
          channel: "IN_APP",
          type: "SUPPORT_TICKET_REPLY",
          subject: `Reply to your ticket: ${ticket.subject}`,
          body: parsed.data.body.slice(0, 200),
          metadata: { ticketId: ticket.id },
        },
      });
      const requester = await db.user.findUnique({
        where: { id: ticket.userId },
        select: { name: true, email: true },
      });
      if (requester?.email) {
        void sendEmail({
          to: requester.email,
          subject: `Reply to your support ticket: ${ticket.subject}`,
          template: "support-reply",
          variables: {
            name: escapeHtml(requester.name ?? ""),
            ticketTitle: escapeHtml(ticket.subject),
            reply: escapeHtml(parsed.data.body).replaceAll("\n", "<br />"),
            ticketUrl: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/dashboard/support`,
          },
        });
      }
    }
    await audit({
      actorId: session.user.id,
      action: "SUPPORT_TICKET_REPLIED",
      entityType: "SupportTicket",
      entityId: ticket.id,
      metadata: { isInternal, via: canVia(session.user.role, "support.manage") },
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
      data: { assignedTo: assigneeId, status: assigneeId ? "IN_PROGRESS" : ticket.status },
    });
    await audit({
      actorId: session.user.id,
      action: "UPDATE",
      entityType: "SupportTicket",
      entityId: ticket.id,
      metadata: { action: "assigned", assigneeId, via: canVia(session.user.role, "support.manage") },
    });
  } else if (parsed.data.action === "priority") {
    if (!parsed.data.priority)
      return NextResponse.json({ error: "Priority is required" }, { status: 400 });
    await db.supportTicket.update({
      where: { id: ticket.id },
      data: { priority: parsed.data.priority },
    });
    await audit({
      actorId: session.user.id,
      action: "UPDATE",
      entityType: "SupportTicket",
      entityId: ticket.id,
      metadata: { priority: parsed.data.priority, via: canVia(session.user.role, "support.manage") },
    });
  } else if (parsed.data.action === "close") {
    // Close requires a resolution summary
    if (!parsed.data.resolutionSummary || parsed.data.resolutionSummary.trim().length < 5)
      return NextResponse.json({ error: "Resolution summary is required when closing a ticket (minimum 5 characters)" }, { status: 400 });
    await db.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        resolvedAt: new Date(),
        resolutionSummary: parsed.data.resolutionSummary.trim(),
      },
    });
    await db.notification.create({
      data: {
        userId: ticket.userId,
        channel: "IN_APP",
        type: "SUPPORT_TICKET_REPLY",
        subject: `Your ticket has been resolved: ${ticket.subject}`,
        body: `Resolution: ${parsed.data.resolutionSummary.trim().slice(0, 200)}`,
        metadata: { ticketId: ticket.id },
      },
    });
    await audit({
      actorId: session.user.id,
      action: "UPDATE",
      entityType: "SupportTicket",
      entityId: ticket.id,
      metadata: { status: "CLOSED", resolutionSummary: parsed.data.resolutionSummary, via: canVia(session.user.role, "support.manage") },
    });
  } else {
    // action === "status"
    if (!parsed.data.status)
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    await db.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: parsed.data.status,
        resolvedAt: ["RESOLVED", "CLOSED"].includes(parsed.data.status) ? new Date() : null,
      },
    });
    await audit({
      actorId: session.user.id,
      action: "UPDATE",
      entityType: "SupportTicket",
      entityId: ticket.id,
      metadata: { status: parsed.data.status, via: canVia(session.user.role, "support.manage") },
    });
  }

  return NextResponse.json({ ok: true });
}
