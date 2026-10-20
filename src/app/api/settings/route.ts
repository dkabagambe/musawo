import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setSetting } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { UpdateSettingSchema } from "@/lib/validators";
import { can, requirePermission, ForbiddenError } from "@/lib/rbac";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "settings.edit"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 }); throw e; }

  let body: z.infer<typeof UpdateSettingSchema>;
  try {
    body = UpdateSettingSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid input", details: err }, { status: 400 });
  }

  const publicSystemKeys = new Set([
    "site.name", "site.domain", "site.url", "site.websiteUrl", "site.supportEmail", "site.admissionsEmail",
    "site.supportPhone", "site.supportPhone2", "site.whatsappNumber", "site.address", "site.mapLat", "site.mapLng",
    "site.tagline", "site.intakeEyebrow", "site.accreditationText", "intake.currentLabel", "site.flyerKey", "course.feeDisplay",
  ]);
  if (publicSystemKeys.has(body.key) && !can(session.user.role, "settings.edit.public")) {
    return NextResponse.json({ error: "Only system administration can change public site settings." }, { status: 403 });
  }
  if (/secret|token|apiKey|AccessKey|password|privateKey/i.test(body.key) && !can(session.user.role, "settings.edit.secrets")) {
    return NextResponse.json({ error: "You cannot change secret settings." }, { status: 403 });
  }

  await setSetting(body.key, body.value, session.user.id);

  await audit({
    actorId: session.user.id,
    action: "SETTINGS_CHANGED",
    entityType: "SiteSetting",
    entityId: body.key,
    metadata: { key: body.key },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
