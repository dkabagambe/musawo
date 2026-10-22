import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, canVia } from "@/lib/rbac";
import { audit } from "@/lib/audit";

const CompleteSchema = z.object({
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/),
  notes: z.string().max(4000).optional(),
  userIds: z.array(z.string().cuid()).max(200),
});

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "staff.access_review"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [users, reviews] = await Promise.all([
    db.user.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        lastAccessReviewAt: true,
      },
      orderBy: { name: "asc" },
    }),
    db.accessReview.findMany({
      orderBy: { completedAt: "desc" },
      take: 12,
      select: { id: true, quarter: true, notes: true, completedAt: true },
    }),
  ]);
  const staff = users.filter((user) => can(user.role, "staff.view"));
  return NextResponse.json({ staff, reviews });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "staff.access_review"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = CompleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const targets = await db.user.findMany({
    where: { id: { in: parsed.data.userIds }, status: "ACTIVE" },
    select: { id: true, role: true },
  });
  const reviewable = targets.filter((target) => can(target.role, "staff.view"));
  if (reviewable.length !== parsed.data.userIds.length)
    return NextResponse.json(
      { error: "Review list contains an unavailable account" },
      { status: 400 },
    );

  const completedAt = new Date();
  const review = await db.$transaction(async (transaction) => {
    await transaction.user.updateMany({
      where: { id: { in: reviewable.map((user) => user.id) } },
      data: { lastAccessReviewAt: completedAt },
    });
    return transaction.accessReview.create({
      data: {
        reviewedById: session.user.id,
        quarter: parsed.data.quarter,
        notes: parsed.data.notes,
        completedAt,
      },
    });
  });
  await audit({
    actorId: session.user.id,
    action: "ACCESS_REVIEW_COMPLETED",
    entityType: "AccessReview",
    entityId: review.id,
    metadata: {
      quarter: review.quarter,
      accountsReviewed: reviewable.length,
      via: canVia(session.user.role, "staff.access_review"),
    },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });
  return NextResponse.json(
    { review, accountsReviewed: reviewable.length },
    { status: 201 },
  );
}
