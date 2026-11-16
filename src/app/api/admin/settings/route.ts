import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/settings
 * Save system settings. Director can edit policies and operational settings.
 * Each setting change is audit logged.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "settings.edit.operational")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    settings?: Array<{ key: string; value: string }>;
  };

  const { settings } = body;

  if (!settings || !Array.isArray(settings)) {
    return NextResponse.json(
      { error: "settings array is required" },
      { status: 400 }
    );
  }

  // Validate each setting
  for (const s of settings) {
    if (!s.key || typeof s.key !== "string") {
      return NextResponse.json(
        { error: `Invalid setting key: ${s.key}` },
        { status: 400 }
      );
    }
    if (s.value === undefined || s.value === null) {
      return NextResponse.json(
        { error: `Missing value for key: ${s.key}` },
        { status: 400 }
      );
    }
  }

  // Fetch old values for audit trail
  const oldSettings = await db.siteSetting.findMany({
    where: { key: { in: settings.map((s) => s.key) } },
  });
  const oldMap = Object.fromEntries(oldSettings.map((s) => [s.key, s.value]));

  // Upsert each setting
  for (const s of settings) {
    await db.siteSetting.upsert({
      where: { key: s.key },
      create: { key: s.key, value: String(s.value) },
      update: { value: String(s.value) },
    });

    // Audit log each change
    const oldValue = oldMap[s.key];
    if (oldValue !== s.value) {
      await audit({
        actorId: session.user.id,
        action: "SETTINGS_CHANGED",
        entityType: "SiteSetting",
        entityId: s.key,
        metadata: {
          key: s.key,
          oldValue: oldValue ?? "(not set)",
          newValue: s.value,
        },
        ip: req.headers.get("x-forwarded-for") ?? undefined,
      });
    }
  }

  return NextResponse.json({ ok: true, updated: settings.length });
}
