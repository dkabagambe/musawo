import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";

/**
 * GET /api/recordings/[id]/position
 * Retrieve the student's last playback position for this recording (live class)
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
    // Find the attendance record for this student and live class
    const attendance = await db.attendance.findUnique({
      where: {
        liveClassId_userId: {
          liveClassId,
          userId: session.user.id,
        },
      },
      select: {
        lastPlaybackPosition: true,
        isWatched: true,
        watchedAt: true,
      },
    });

    return NextResponse.json({
      position: attendance?.lastPlaybackPosition ?? 0,
      isWatched: attendance?.isWatched ?? false,
      watchedAt: attendance?.watchedAt,
    });
  } catch (error) {
    console.error("Failed to fetch playback position:", error);
    return NextResponse.json(
      { error: "Failed to fetch position" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/recordings/[id]/position
 * Save the student's current playback position for this recording
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
  const { position } = body;

  if (typeof position !== "number" || position < 0) {
    return NextResponse.json(
      { error: "Invalid position" },
      { status: 400 },
    );
  }

  try {
    // Update or create the attendance record with the new position
    const attendance = await db.attendance.upsert({
      where: {
        liveClassId_userId: {
          liveClassId,
          userId: session.user.id,
        },
      },
      update: {
        lastPlaybackPosition: position,
      },
      create: {
        liveClassId,
        userId: session.user.id,
        lastPlaybackPosition: position,
      },
    });

    return NextResponse.json({
      success: true,
      position: attendance.lastPlaybackPosition,
    });
  } catch (error) {
    console.error("Failed to save playback position:", error);
    return NextResponse.json(
      { error: "Failed to save position" },
      { status: 500 },
    );
  }
}
