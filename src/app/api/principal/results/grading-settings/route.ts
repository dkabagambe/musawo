import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const gradingSettingsSchema = z.object({
  id: z.string().optional(),
  courseId: z.string(),
  passMarkPercent: z.number().min(0).max(100),
  gradeAMin: z.number().min(0).max(100),
  gradeBMin: z.number().min(0).max(100),
  gradeCMin: z.number().min(0).max(100),
  gradeDMin: z.number().min(0).max(100),
});

/**
 * POST /api/principal/results/grading-settings
 * Create grading system settings for a course
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "grades.edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = gradingSettingsSchema.parse(body);

    // Check if settings already exist for this course
    const existing = await db.gradingSystemSetting.findUnique({
      where: { courseId: validated.courseId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Grading settings already exist for this course" },
        { status: 400 }
      );
    }

    const settings = await db.gradingSystemSetting.create({
      data: {
        courseId: validated.courseId,
        passMarkPercent: validated.passMarkPercent,
        gradeAMin: validated.gradeAMin,
        gradeBMin: validated.gradeBMin,
        gradeCMin: validated.gradeCMin,
        gradeDMin: validated.gradeDMin,
      },
      include: {
        course: { select: { title: true, courseCode: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "GradingSystemSetting",
        entityId: settings.id,
        details: `Created grading settings for ${settings.course.courseCode} - Pass: ${settings.passMarkPercent}%, A: ${settings.gradeAMin}%, B: ${settings.gradeBMin}%, C: ${settings.gradeCMin}%, D: ${settings.gradeDMin}%`,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to create grading settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/principal/results/grading-settings
 * Update grading system settings
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "grades.edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = gradingSettingsSchema.parse(body);

    if (!validated.id) {
      return NextResponse.json({ error: "Settings ID required" }, { status: 400 });
    }

    const existing = await db.gradingSystemSetting.findUnique({
      where: { id: validated.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Settings not found" }, { status: 404 });
    }

    const settings = await db.gradingSystemSetting.update({
      where: { id: validated.id },
      data: {
        passMarkPercent: validated.passMarkPercent,
        gradeAMin: validated.gradeAMin,
        gradeBMin: validated.gradeBMin,
        gradeCMin: validated.gradeCMin,
        gradeDMin: validated.gradeDMin,
      },
      include: {
        course: { select: { title: true, courseCode: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "GradingSystemSetting",
        entityId: settings.id,
        details: `Updated grading settings for ${settings.course.courseCode} - Pass: ${settings.passMarkPercent}%, A: ${settings.gradeAMin}%, B: ${settings.gradeBMin}%, C: ${settings.gradeCMin}%, D: ${settings.gradeDMin}%`,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to update grading settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
