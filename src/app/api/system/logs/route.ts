/**
 * GET /api/system/logs  - list structured system logs (IT Admin only)
 * POST /api/system/logs - write a log entry (internal/server use)
 *
 * Logs contain NO personal data, secrets, or business information.
 * They record infrastructure events: errors, warnings, job runs,
 * deployment events, service failures.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";

const CreateLogSchema = z.object({
  level: z.enum(["INFO", "WARN", "ERROR"]),
  source: z.string().min(1).max(60),
  route: z.string().max(200).optional(),
  requestId: z.string().max(60).optional(),
  message: z.string().min(1).max(2000),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level"); // INFO | WARN | ERROR
  const source = searchParams.get("source");
  const search = searchParams.get("search");
  const pageStr = searchParams.get("page");
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));
  const pageSize = 50;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (level && level !== "ALL") where.level = level;
  if (source && source !== "ALL") where.source = source;
  if (search) {
    where.OR = [
      { message: { contains: search, mode: "insensitive" } },
      { route: { contains: search, mode: "insensitive" } },
      { source: { contains: search, mode: "insensitive" } },
    ];
  }

  // 30-day retention window
  where.createdAt = { gte: new Date(Date.now() - 30 * 86400000) };

  const [total, logs] = await Promise.all([
    db.systemLog.count({ where }),
    db.systemLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // Error grouping (top sources and routes)
  const errorGroups = await db.systemLog.groupBy({
    by: ["source", "level"],
    _count: { id: true },
    where: {
      level: { in: ["WARN", "ERROR"] },
      createdAt: { gte: new Date(Date.now() - 86400000) },
    },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  return NextResponse.json({
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    errorGroups,
  });
}

// Internal: write a log entry (no auth required, server-side only)
export async function POST(req: NextRequest) {
  // Only allow from same-origin server calls (no external auth needed)
  const internalKey = req.headers.get("x-internal-key");
  if (internalKey !== process.env.INTERNAL_API_KEY && process.env.APP_ENV === "production") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = CreateLogSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  // Redact any secrets or tokens from metadata
  const safeMetadata = parsed.data.metadata
    ? JSON.parse(
        JSON.stringify(parsed.data.metadata, (key, val) => {
          if (typeof key === "string" && /key|secret|token|password|pass|auth/i.test(key)) {
            return "[REDACTED]";
          }
          return val;
        })
      )
    : null;

  await db.systemLog.create({
    data: {
      level: parsed.data.level,
      source: parsed.data.source,
      route: parsed.data.route,
      requestId: parsed.data.requestId,
      message: parsed.data.message,
      metadata: safeMetadata,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
