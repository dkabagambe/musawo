import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** GET /api/announcements - site-wide + course announcements for enrolled student */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id, status: { in: ["ACTIVE", "COMPLETED"] } },
    select: { courseId: true },
  });
  const courseIds = enrolments.map((e) => e.courseId);

  const announcements = await db.announcement.findMany({
    where: {
      OR: [
        { courseId: null },
        { courseId: { in: courseIds } },
      ],
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 30,
    include: {
      author: { select: { name: true } },
      course: { select: { title: true } },
    },
  });

  return NextResponse.json({ announcements });
}
