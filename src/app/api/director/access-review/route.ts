import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, STAFF_ROLES } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

const Schema = z.object({
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/),
  notes:   z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "access_review.complete")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const review = await db.accessReview.create({
    data: {
      reviewedById: session.user.id,
      quarter:      parsed.data.quarter,
      notes:        parsed.data.notes ?? null,
    },
  });

  // Stamp lastAccessReviewAt on all active staff accounts
  await db.user.updateMany({
    where: { role: { in: STAFF_ROLES }, status: "ACTIVE" },
    data:  { lastAccessReviewAt: new Date() },
  });

  await audit({
    actorId:    session.user.id,
    action:     "ACCESS_REVIEW_COMPLETED",
    entityType: "AccessReview",
    entityId:   review.id,
    metadata:   { quarter: parsed.data.quarter },
    ip:         req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true, id: review.id });
}
