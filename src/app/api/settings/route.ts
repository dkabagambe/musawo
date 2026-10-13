import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setSetting } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { UpdateSettingSchema } from "@/lib/validators";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
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
