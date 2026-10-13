import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { z } from "zod";

const Schema = z.object({
  code: z.string().min(3).max(50),
  type: z.enum(["SCHOLARSHIP", "PERCENTAGE", "FIXED_AMOUNT"]),
  value: z.number().int().min(0).default(0),
  maxUses: z.number().int().min(1).optional(),
  courseId: z.string().cuid().optional(),
  expiresAt: z.string().optional(),
});

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "scholarships.initiate"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 }); throw e; }
  const codes = await db.discountCode.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ codes });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "scholarships.initiate"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 }); throw e; }

  // Support both JSON and form POST
  let body: Record<string, unknown>;
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    body = await req.json();
  } else {
    const fd = await req.formData();
    body = {
      code: fd.get("code"),
      type: fd.get("type"),
      value: Number(fd.get("value") ?? 0),
      maxUses: fd.get("maxUses") ? Number(fd.get("maxUses")) : undefined,
      courseId: fd.get("courseId") || undefined,
      expiresAt: fd.get("expiresAt") || undefined,
    };
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const existing = await db.discountCode.findUnique({ where: { code: parsed.data.code } });
  if (existing) return NextResponse.json({ error: "Code already exists." }, { status: 409 });

  const code = await db.discountCode.create({
    data: {
      code: parsed.data.code.toUpperCase(),
      type: parsed.data.type,
      value: parsed.data.value,
      maxUses: parsed.data.maxUses ?? null,
      courseId: parsed.data.courseId ?? null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      createdBy: session.user.id,
    },
  });

  // If form POST redirect back
  if (!ct.includes("application/json")) {
    return new Response(null, { status: 302, headers: { Location: "/admin/scholarships" } });
  }
  return NextResponse.json({ code }, { status: 201 });
}
