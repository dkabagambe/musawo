/**
 * GET    /api/board/documents/[id]  - view one document (board_documents.view)
 * PATCH  /api/board/documents/[id]  - update a document (board_documents.manage)
 * DELETE /api/board/documents/[id]  - soft-archive a document (board_documents.manage)
 *
 * Documents are never hard-deleted; a DELETE sets deletedAt (soft delete).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, canForUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

async function getUser(id: string) {
  return db.user.findUnique({ where: { id }, select: { institutionSecretary: true } });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user.role, "board_documents.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const doc = await db.boardDocument.findUnique({
    where:   { id: params.id },
    include: { author: { select: { name: true } } },
  });

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Log AUDITOR_READONLY access
  if (session.user.role === "AUDITOR_READONLY") {
    await audit({
      actorId:    session.user.id,
      action:     "BOARD_DOCUMENT_UPDATED",
      entityType: "BoardDocument",
      entityId:   doc.id,
      metadata:   { action: "viewed", title: doc.title },
      ip:         req.headers.get("x-forwarded-for") ?? undefined,
    });
  }

  return NextResponse.json({ document: doc });
}

const UpdateSchema = z.object({
  title:       z.string().min(2).max(300).optional(),
  description: z.string().max(2000).optional(),
  fileS3Key:   z.string().max(500).optional(),
  fileUrl:     z.string().url().max(1000).optional(),
  category:    z.enum(["GENERAL", "POLICY", "MINUTES", "REPORT", "FINANCIAL", "GOVERNANCE"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUser(session.user.id);
  if (!canForUser(session.user.role, "board_documents.manage", { institutionSecretary: user?.institutionSecretary ?? false })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = UpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const doc = await db.boardDocument.update({
    where: { id: params.id },
    data:  parsed.data,
  });

  await audit({
    actorId:    session.user.id,
    action:     "BOARD_DOCUMENT_UPDATED",
    entityType: "BoardDocument",
    entityId:   doc.id,
    metadata:   { changes: Object.keys(parsed.data) },
    ip:         req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ document: doc });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUser(session.user.id);
  if (!canForUser(session.user.role, "board_documents.manage", { institutionSecretary: user?.institutionSecretary ?? false })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft delete: documents are never hard-deleted per spec
  await db.boardDocument.delete({ where: { id: params.id } });

  await audit({
    actorId:    session.user.id,
    action:     "BOARD_DOCUMENT_DELETED",
    entityType: "BoardDocument",
    entityId:   params.id,
    metadata:   {},
    ip:         req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ deleted: true });
}
