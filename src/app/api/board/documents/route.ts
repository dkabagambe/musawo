/**
 * GET    /api/board/documents   - list board documents (audit.view.full)
 * POST   /api/board/documents   - create a board document (policies.edit)
 *
 * Board documents are now accessible to DIRECTOR (audit.view.full) and
 * manageable by DIRECTOR and PRINCIPAL (policies.edit).
 * The BOARD_MEMBER and AUDITOR_READONLY roles have been removed (remarks.md s1).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, ForbiddenError } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

/** GET: list all board documents */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user.role, "audit.view.full") && !can(session.user.role, "policies.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const documents = await db.boardDocument.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  });

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

  if (!can(session.user.role, "policies.edit")) {
    return NextResponse.json({ error: "Forbidden: only Director or Principal may create board documents." }, { status: 403 });
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
