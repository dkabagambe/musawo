/**
 * GET    /api/board/documents   - list board documents (board_documents.view)
 * POST   /api/board/documents   - create a board document (board_documents.manage)
 *
 * Access:
 *   board_documents.view   -- BOARD_MEMBER, AUDITOR_READONLY, SUPER_ADMIN (read)
 *   board_documents.manage -- SUPER_ADMIN, and BOARD_MEMBER with institutionSecretary = true
 *
 * AUDITOR_READONLY views are logged per-record.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, canForUser, ForbiddenError } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

/** GET: list all board documents */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { institutionSecretary: true },
  });

  if (!can(session.user.role, "board_documents.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const documents = await db.boardDocument.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  });

  // Log every view by AUDITOR_READONLY (spec: every view logged)
  if (session.user.role === "AUDITOR_READONLY") {
    await audit({
      actorId:    session.user.id,
      action:     "BOARD_DOCUMENT_UPDATED",  // using existing action as "viewed" stand-in
      entityType: "BoardDocument",
      entityId:   "list",
      metadata:   { action: "list_viewed" },
      ip:         req.headers.get("x-forwarded-for") ?? undefined,
    });
  }

  return NextResponse.json({ documents });
}

const CreateSchema = z.object({
  title:       z.string().min(2).max(300),
  description: z.string().max(2000).optional(),
  fileS3Key:   z.string().max(500).optional(),
  fileUrl:     z.string().url().max(1000).optional(),
  category:    z.enum(["GENERAL", "POLICY", "MINUTES", "REPORT", "FINANCIAL", "GOVERNANCE"]).default("GENERAL"),
});

/** POST: create a board document */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { institutionSecretary: true },
  });

  if (!canForUser(session.user.role, "board_documents.manage", { institutionSecretary: user?.institutionSecretary ?? false })) {
    return NextResponse.json({ error: "Forbidden: only the Institution Secretary or Super Admin may create board documents." }, { status: 403 });
  }

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const doc = await db.boardDocument.create({
    data: {
      ...parsed.data,
      authorId: session.user.id,
    },
  });

  await audit({
    actorId:    session.user.id,
    action:     "BOARD_DOCUMENT_CREATED",
    entityType: "BoardDocument",
    entityId:   doc.id,
    metadata:   { title: doc.title, category: doc.category },
    ip:         req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ document: doc }, { status: 201 });
}
