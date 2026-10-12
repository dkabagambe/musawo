import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET enrolled courses for forum thread creation
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id, status: { in: ["ACTIVE", "COMPLETED"] } },
    include: { course: { select: { id: true, title: true } } },
  });

  return NextResponse.json({ courses: enrolments.map((e) => e.course) });
}
