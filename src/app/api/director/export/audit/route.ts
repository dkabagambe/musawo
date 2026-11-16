import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "audit.view.full")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url    = new URL(req.url);
  const action = url.searchParams.get("action")?.toUpperCase() ?? "";
  const role   = url.searchParams.get("role")   ?? "";
  const user   = url.searchParams.get("user")?.trim() ?? "";
  const entity = url.searchParams.get("entity") ?? "";
  const from   = url.searchParams.get("from")   ?? "";
  const to     = url.searchParams.get("to")     ?? "";

  const where: Record<string, unknown> = {};
  if (action) where.action = action as never;
  if (entity) where.entityType = entity;
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.gte = new Date(from);
    if (to)   range.lte = new Date(to + "T23:59:59Z");
    where.createdAt = range;
  }
  if (role || user) {
    where.actor = {
      ...(role ? { role: role as never } : {}),
      ...(user ? { name: { contains: user, mode: "insensitive" } } : {}),
    };
  }

  const logs = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take:    10000,
    include: { actor: { select: { name: true, role: true } } },
  });

  // Log the export itself
  await audit({
    actorId:    session.user.id,
    action:     "BULK_EXPORT",
    entityType: "AuditLog",
    metadata:   {
      type:    "audit-log",
      filters: { action, role, user, entity, from, to },
      count:   logs.length,
      format:  "CSV",
    },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  function csvEscape(val: unknown): string {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  const header = [
    "Date (Kampala)", "Actor", "Role", "Action",
    "Entity Type", "Entity ID", "IP", "Description",
  ].join(",");

  const rows = logs.map((log) => {
    const meta = log.metadata as Record<string, unknown> | null;
    const desc = `${log.actor?.name ?? "System"} performed ${log.action.replace(/_/g, " ").toLowerCase()}${
      meta?.type ? ` (${String(meta.type).replace(/_/g, " ")})` : ""
    }`;
    return [
      new Date(log.createdAt).toLocaleString("en-UG", { timeZone: "Africa/Kampala" }),
      log.actor?.name ?? "System",
      log.actor?.role ?? "",
      log.action,
      log.entityType ?? "",
      log.entityId   ?? "",
      log.ip         ?? "",
      desc,
    ].map(csvEscape).join(",");
  });

  const csv = [header, ...rows].join("\n");
  const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
