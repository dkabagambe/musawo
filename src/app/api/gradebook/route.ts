import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";

/** GET /api/gradebook - student's own published grade summary */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Students see only published grades (releasedAt IS NOT NULL).
  // Staff can bypass this by using the admin gradebook endpoints.
  const grades = await db.gradeEntry.findMany({
    where: { userId: session.user.id, releasedAt: { not: null } },
    orderBy: { releasedAt: "desc" },
    include: { course: { select: { title: true, slug: true } } },
  });

  return NextResponse.json({ grades });
}
