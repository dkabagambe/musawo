/**
 * GET  /api/system/alerts  - list alerts (IT Admin only)
 * POST /api/system/alerts  - raise an alert (server-side / cron use)
 * PATCH /api/system/alerts - acknowledge or resolve an alert
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";

const CreateAlertSchema = z.object({
  ruleKey: z.string().min(1).max(60),
  severity: z.enum(["WARNING", "CRITICAL"]).default("WARNING"),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateAlertSchema = z.object({
  id: z.string().cuid(),
  action: z.enum(["acknowledge", "resolve"]),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "OPEN";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = 30;

  const where = status === "ALL" ? {} : { status };
  const [total, alerts] = await Promise.all([
    db.alertItem.count({ where }),
    db.alertItem.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    alerts,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  // Allow server-side (cron jobs) and IT Admin
  const session = await auth();
  const internalKey = req.headers.get("x-internal-key");
  const isInternal = internalKey === process.env.INTERNAL_API_KEY;

  if (!isInternal && (!session?.user || !can(session.user.role, "health.view"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = CreateAlertSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  // De-duplicate: don't create a new alert if an identical OPEN one already exists
  const existing = await db.alertItem.findFirst({
    where: { ruleKey: parsed.data.ruleKey, status: "OPEN" },
  });
  if (existing) {
    return NextResponse.json({ id: existing.id, deduplicated: true });
  }

  const alert = await db.alertItem.create({
    data: {
      ruleKey: parsed.data.ruleKey,
      severity: parsed.data.severity,
      title: parsed.data.title,
      description: parsed.data.description,
      metadata: parsed.data.metadata ?? null,
    },
  });

  // Notify IT Admin in-app
  try {
    const managers = await db.user.findMany({
      where: { role: "SYSTEM_IT", status: "ACTIVE" },
      select: { id: true },
    });
    if (managers.length > 0) {
      await db.notification.createMany({
        data: managers.map((m) => ({
          userId: m.id,
          channel: "IN_APP" as const,
          type: "SYSTEM_ALERT",
          subject: `${parsed.data.severity}: ${parsed.data.title}`,
          body: parsed.data.description,
          metadata: { alertId: alert.id },
        })),
      });
    }
  } catch { /* non-fatal */ }

  return NextResponse.json({ id: alert.id }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = UpdateAlertSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const alert = await db.alertItem.findUnique({ where: { id: parsed.data.id } });
  if (!alert) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.action === "acknowledge") {
    await db.alertItem.update({
      where: { id: alert.id },
      data: { status: "ACKNOWLEDGED", acknowledgedById: session.user.id, acknowledgedAt: new Date() },
    });
  } else {
    await db.alertItem.update({
      where: { id: alert.id },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
