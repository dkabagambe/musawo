/**
 * GET  /api/support/canned-replies - list all active canned replies (managers only)
 * POST /api/support/canned-replies - create a new canned reply
 * PATCH /api/support/canned-replies - update or delete an existing canned reply
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";

const CreateSchema = z.object({
  title: z.string().min(2).max(100),
  body: z.string().min(5).max(3000),
  category: z.string().max(60).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

const UpdateSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(2).max(100).optional(),
  body: z.string().min(5).max(3000).optional(),
  category: z.string().max(60).optional().nullable(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  delete: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "support.manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const replies = await db.cannedReply.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  return NextResponse.json({ replies });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "support.manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const reply = await db.cannedReply.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      category: parsed.data.category ?? null,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });
  return NextResponse.json({ reply }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "support.manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = UpdateSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await db.cannedReply.findUnique({ where: { id: parsed.data.id } });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.delete) {
    await db.cannedReply.delete({ where: { id: parsed.data.id } });
    return NextResponse.json({ ok: true });
  }

  await db.cannedReply.update({
    where: { id: parsed.data.id },
    data: {
      title: parsed.data.title ?? existing.title,
      body: parsed.data.body ?? existing.body,
      category: "category" in parsed.data ? (parsed.data.category ?? null) : existing.category,
      active: parsed.data.active ?? existing.active,
      sortOrder: parsed.data.sortOrder ?? existing.sortOrder,
    },
  });
  return NextResponse.json({ ok: true });
}
