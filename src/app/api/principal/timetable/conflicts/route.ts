import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";

const schema = z.object({
  scheduledAt: z.string(), // ISO datetime string
  durationMin: z.number().int().min(15).max(480),
  tutorId: z.string().min(1),
  venue: z.string().optional(),
  excludeClassId: z.string().optional(), // Exclude this class when editing
});

interface Conflict {
  type: "instructor" | "venue";
  message: string;
  existingClass: {
    id: string;
    title: string;
    scheduledAt: Date;
    durationMin: number;
  };
}

/**
 * POST /api/principal/timetable/conflicts
 * Check for scheduling conflicts
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !can(session.user.role, "courses.view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = schema.parse(body);

    const scheduledAt = new Date(data.scheduledAt);
    const endsAt = new Date(scheduledAt.getTime() + data.durationMin * 60 * 1000);

    const conflicts: Conflict[] = [];

    // Find overlapping classes
    const overlapping = await db.liveClass.findMany({
      where: {
        id: data.excludeClassId ? { not: data.excludeClassId } : undefined,
        status: { in: ["SCHEDULED", "LIVE"] },
        OR: [
          // Case 1: Existing class starts before new class ends and ends after new class starts
          {
            AND: [
              { scheduledAt: { lt: endsAt } },
              {
                scheduledAt: {
                  gte: new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000), // Within same day
                },
              },
            ],
          },
        ],
      },
      include: {
        course: { select: { title: true } },
        tutor: { select: { name: true } },
      },
    });

    // Check each overlapping class for conflicts
    for (const existing of overlapping) {
      const existingEndsAt = new Date(
        existing.scheduledAt.getTime() + existing.durationMin * 60 * 1000,
      );

      // Check if times actually overlap
      const hasTimeOverlap =
        (scheduledAt >= existing.scheduledAt && scheduledAt < existingEndsAt) ||
        (endsAt > existing.scheduledAt && endsAt <= existingEndsAt) ||
        (scheduledAt <= existing.scheduledAt && endsAt >= existingEndsAt);

      if (!hasTimeOverlap) continue;

      // Instructor conflict
      if (existing.tutorId === data.tutorId) {
        conflicts.push({
          type: "instructor",
          message: `${existing.tutor.name} is already teaching "${existing.title}" (${existing.course.title}) at this time`,
          existingClass: {
            id: existing.id,
            title: existing.title,
            scheduledAt: existing.scheduledAt,
            durationMin: existing.durationMin,
          },
        });
      }

      // Venue conflict (if venue is specified and not "Online")
      if (
        data.venue &&
        data.venue.toLowerCase() !== "online" &&
        existing.venue &&
        existing.venue.toLowerCase() !== "online" &&
        existing.venue.toLowerCase() === data.venue.toLowerCase()
      ) {
        conflicts.push({
          type: "venue",
          message: `Venue "${data.venue}" is already booked for "${existing.title}" at this time`,
          existingClass: {
            id: existing.id,
            title: existing.title,
            scheduledAt: existing.scheduledAt,
            durationMin: existing.durationMin,
          },
        });
      }
    }

    return NextResponse.json({ conflicts });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.errors },
        { status: 400 },
      );
    }
    console.error("Failed to check conflicts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
