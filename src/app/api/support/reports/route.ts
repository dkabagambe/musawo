/**
 * GET /api/support/reports
 * Returns ticket analytics for the IT Admin dashboard:
 *   - counts by status, category, priority
 *   - average first response time (minutes)
 *   - average resolution time (minutes)
 *   - SLA breach rate
 *   - busiest categories
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { getSetting } from "@/lib/settings";

export async function GET() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "support.manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const slaHours = parseInt(await getSetting("support.slaFirstResponseHours", "4"), 10);
  const slaMinutes = slaHours * 60;

  const [allTickets, replyCounts] = await Promise.all([
    db.supportTicket.findMany({
      select: {
        id: true,
        status: true,
        category: true,
        priority: true,
        createdAt: true,
        firstResponseAt: true,
        firstResponseTargetMinutes: true,
        resolvedAt: true,
        closedAt: true,
      },
    }),
    db.supportReply.groupBy({
      by: ["ticketId"],
      _count: { id: true },
      where: { isInternal: false },
    }),
  ]);

  // Status counts
  const byStatus = { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 };
  for (const t of allTickets) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
  }

  // Category counts
  const byCategory: Record<string, number> = {};
  for (const t of allTickets) {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
  }

  // Priority counts
  const byPriority = { LOW: 0, NORMAL: 0, HIGH: 0, URGENT: 0 };
  for (const t of allTickets) {
    byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
  }

  // SLA breach: tickets not yet responded to that are overdue
  const now = Date.now();
  let slaBreachCount = 0;
  let slaMetCount = 0;
  const responseTimes: number[] = [];
  const resolutionTimes: number[] = [];

  for (const t of allTickets) {
    const target = t.firstResponseTargetMinutes ?? slaMinutes;
    if (t.firstResponseAt) {
      slaMetCount++;
      const responseMs = new Date(t.firstResponseAt).getTime() - new Date(t.createdAt).getTime();
      responseTimes.push(responseMs / 60000);
    } else if (t.status !== "OPEN" && t.status !== "IN_PROGRESS") {
      // closed without first response recorded - treat as unknown
    } else {
      // still open - check if overdue
      const ageMinutes = (now - new Date(t.createdAt).getTime()) / 60000;
      if (ageMinutes > target) slaBreachCount++;
    }

    if (t.resolvedAt || t.closedAt) {
      const closeTime = t.closedAt ?? t.resolvedAt;
      if (closeTime) {
        const resMs = new Date(closeTime).getTime() - new Date(t.createdAt).getTime();
        resolutionTimes.push(resMs / 60000);
      }
    }
  }

  const avgFirstResponseMinutes =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null;

  const avgResolutionMinutes =
    resolutionTimes.length > 0
      ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
      : null;

  const replyCountMap = Object.fromEntries(
    replyCounts.map((r) => [r.ticketId, r._count.id]),
  );

  // Open tickets with no reply (needs attention)
  const noReplyOpen = allTickets.filter(
    (t) => (t.status === "OPEN" || t.status === "IN_PROGRESS") && !replyCountMap[t.id],
  ).length;

  return NextResponse.json({
    total: allTickets.length,
    byStatus,
    byCategory,
    byPriority,
    slaBreachCount,
    slaMetCount,
    slaTargetMinutes: slaMinutes,
    avgFirstResponseMinutes,
    avgResolutionMinutes,
    noReplyOpen,
  });
}
