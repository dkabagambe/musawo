import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";

/**
 * POST /api/recordings/[id]/watched
 * Mark a recording as watched by the student
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: liveClassId } = await params;
  const body = await req.json();
  const { watched = true } = body;

  try {
    // Update or create the attendance record with the watched status
    const attendance = await db.attendance.upsert({
      where: {
        liveClassId_userId: {
          liveClassId,
          userId: session.user.id,
        },
      },
      update: {
        isWatched: watched,
        watchedAt: watched ? new Date() : null,
      },
      create: {
        liveClassId,
        userId: session.user.id,
        isWatched: watched,
        watchedAt: watched ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      isWatched: attendance.isWatched,
      watchedAt: attendance.watchedAt,
    });
  } catch (error) {
    console.error("Failed to update watched status:", error);
    return NextResponse.json(
      { error: "Failed to update watched status" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/recordings/[id]/watched
 * Get the watched status for a recording
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: liveClassId } = await params;

  try {
    const attendance = await db.attendance.findUnique({
      where: {
        liveClassId_userId: {
          liveClassId,
          userId: session.user.id,
        },
      },
      select: {
        isWatched: true,
        watchedAt: true,
      },
    });

    return NextResponse.json({
      isWatched: attendance?.isWatched ?? false,
      watchedAt: attendance?.watchedAt,
    });
  } catch (error) {
    console.error("Failed to fetch watched status:", error);
    return NextResponse.json(
      { error: "Failed to fetch watched status" },
      { status: 500 },
    );
  }
}
