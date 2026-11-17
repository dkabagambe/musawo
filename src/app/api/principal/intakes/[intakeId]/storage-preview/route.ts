import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

interface Props {
  params: { intakeId: string };
}

export async function GET(_req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { intakeId } = params;

  // Get all enrolments for this intake
  const enrolments = await db.enrolment.findMany({
    where: { intakeId },
    select: { id: true, courseId: true },
  });

  if (enrolments.length === 0) {
    return NextResponse.json({ recordings: 0, materials: 0, totalMB: 0 });
  }

  const courseIds = [...new Set(enrolments.map((e) => e.courseId))];

  // Count recordings (ClassPresentation) for live classes in these courses
  const recordings = await db.classPresentation.count({
    where: {
      liveClass: { courseId: { in: courseIds } },
    },
  });

  // Count materials (Resource) for these courses
  const materials = await db.resource.count({
    where: { courseId: { in: courseIds } },
  });

  // Estimate total size (simplified - in production would query actual S3 sizes)
  // Assuming average 50MB per recording, 5MB per material
  const estimatedMB = recordings * 50 + materials * 5;

  return NextResponse.json({
    recordings,
    materials,
    totalMB: estimatedMB,
  });
}
