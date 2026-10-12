import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courses = await db.course.findMany({
    where: { tutorId: session.user.id, status: "PUBLISHED" },
    include: {
      blocks: { orderBy: { order: "asc" }, select: { id: true, title: true, order: true } },
    },
  });

  return NextResponse.json({ courses });
}
