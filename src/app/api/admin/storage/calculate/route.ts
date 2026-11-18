import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !can(session.user.role, "storage.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const intakeId = searchParams.get("intakeId");

    if (!intakeId) {
      return NextResponse.json(
        { error: "intakeId is required" },
        { status: 400 }
      );
    }

    // Get intake to verify it exists and is closed
    const intake = await db.intake.findUnique({
      where: { id: intakeId },
      include: {
        enrolments: {
          include: {
            user: { select: { id: true } },
          },
        },
      },
    });

    if (!intake) {
      return NextResponse.json({ error: "Intake not found" }, { status: 404 });
    }

    if (intake.status !== "CLOSED") {
      return NextResponse.json(
        { error: "Only closed intakes can be cleared" },
        { status: 400 }
      );
    }

    const studentIds = intake.enrolments.map((e) => e.user.id);

    // Calculate storage usage
    // Note: These are estimates - in production, would query actual storage
    const [recordingCount, noteCount, uploadCount] = await Promise.all([
      // Recordings from live classes
      db.liveClass.count({
        where: {
          courseId: intake.courseId,
          createdAt: {
            gte: intake.startDate,
            lte: intake.endDate,
          },
        },
      }),
      // Notes and materials
      db.lessonNote.count({
        where: {
          lesson: {
            course: { intakes: { some: { id: intakeId } } },
          },
          createdAt: {
            gte: intake.startDate,
            lte: intake.endDate,
          },
        },
      }),
      // Temporary uploads
      db.document.count({
        where: {
          userId: { in: studentIds },
          createdAt: {
            gte: intake.startDate,
            lte: intake.endDate,
          },
          type: { in: ["upload", "temporary"] },
        },
      }),
    ]);

    // Estimate sizes (rough averages)
    const avgRecordingSize = 150 * 1024 * 1024; // 150 MB per recording
    const avgNoteSize = 2 * 1024 * 1024; // 2 MB per note/material
    const avgUploadSize = 5 * 1024 * 1024; // 5 MB per upload
    const avgCacheSize = 50 * 1024 * 1024; // 50 MB cache per student

    const recordings = recordingCount * avgRecordingSize;
    const notes = noteCount * avgNoteSize;
    const uploads = uploadCount * avgUploadSize;
    const cache = studentIds.length * avgCacheSize;

    return NextResponse.json({
      recordings,
      notes,
      uploads,
      cache,
      total: recordings + notes + uploads + cache,
      counts: {
        recordings: recordingCount,
        notes: noteCount,
        uploads: uploadCount,
        students: studentIds.length,
      },
    });
  } catch (error) {
    console.error("Storage calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate storage" },
      { status: 500 }
    );
  }
}
