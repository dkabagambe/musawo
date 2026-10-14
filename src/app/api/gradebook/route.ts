import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** GET /api/gradebook - student's own grade summary */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const grades = await db.gradeEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { course: { select: { title: true, slug: true } } },
  });

  return NextResponse.json({ grades });
}
