import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { getPresignedUploadUrl, getPresignedDownloadUrl } from "@/lib/s3";
import { audit } from "@/lib/audit";
import { z } from "zod";
import { canAccessTeachingCourse, teachingCourseRelationWhere } from "@/lib/teaching/scope";
import { can } from "@/lib/rbac";

export const runtime = "nodejs";

/** GET /api/tutor/materials?courseId=xxx - list materials for tutor's courses */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "courses.view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");

  const where = courseId
    ? { courseId, course: teachingCourseRelationWhere(session.user.id) }
    : { course: teachingCourseRelationWhere(session.user.id) };

  const lessons = await db.lesson.findMany({
    where: {
      block: where,
    },
    include: {
      block: { select: { id: true, title: true, order: true, courseId: true, course: { select: { title: true } } } },
    },
    orderBy: [{ block: { order: "asc" } }, { order: "asc" }],
  });

  // Also get resources uploaded by this tutor
  const resources = await db.resource.findMany({
    where: { uploadedBy: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ lessons, resources });
}

const UploadUrlSchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(1).max(100),
  fileSize: z.number().int().positive().max(50 * 1024 * 1024).optional(),
  courseId: z.string().cuid(),
  blockId: z.string().cuid().optional(),
  lessonTitle: z.string().min(2).max(200),
  lessonType: z.enum(["VIDEO", "NOTES"]),
});

/** POST /api/tutor/materials - get presigned upload URL + create lesson placeholder */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "content.upload"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: (e as Error).message }, { status: 403 }); throw e; }

  const parsed = UploadUrlSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const { fileName, contentType, fileSize, courseId, blockId, lessonTitle, lessonType } = parsed.data;
  const extension = fileName.split(".").pop()?.toLowerCase();
  const supportedTypes: Record<string, string[]> = {
    pdf: ["application/pdf"], docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    png: ["image/png"], jpg: ["image/jpeg"], jpeg: ["image/jpeg"],
  };
  if (lessonType === "NOTES" && (!extension || !supportedTypes[extension] || !supportedTypes[extension].includes(contentType))) return NextResponse.json({ error: "Upload a PDF, DOCX, PPTX, PNG or JPEG file with its matching file type." }, { status: 400 });
  if (lessonType === "NOTES" && !fileSize) return NextResponse.json({ error: "File size is required." }, { status: 400 });
  if (lessonType === "NOTES" && fileSize && fileSize > 50 * 1024 * 1024) return NextResponse.json({ error: "Files must be 50 MB or smaller." }, { status: 400 });

  // Verify the tutor owns this course
  const course = await db.course.findFirst({ where: { id: courseId, ...teachingCourseRelationWhere(session.user.id) } });
  if (!course) return NextResponse.json({ error: "Course not found or not assigned to you." }, { status: 404 });

  // Find or create the block
  let block = blockId
    ? await db.block.findFirst({ where: { id: blockId, courseId } })
    : null;

  if (!block) {
    // Use the last block order + 1, or 1 if no blocks
    const lastBlock = await db.block.findFirst({
      where: { courseId },
      orderBy: { order: "desc" },
    });
    block = await db.block.create({
      data: {
        courseId,
        order: (lastBlock?.order ?? 0) + 1,
        title: "Uploaded Materials",
      },
    });
  }

  // Get the next lesson order
  const lastLesson = await db.lesson.findFirst({
    where: { blockId: block.id },
    orderBy: { order: "desc" },
  });
  const lessonOrder = (lastLesson?.order ?? 0) + 1;

  // Generate S3 key
  const s3Key = lessonType === "NOTES" ? `materials/${courseId}/${block.id}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}` : null;

  // Get presigned upload URL
  const uploadUrl = s3Key ? await getPresignedUploadUrl(s3Key, contentType) : null;

  // Create lesson placeholder
  const lesson = await db.lesson.create({
    data: {
      blockId: block.id,
      order: lessonOrder,
      title: lessonTitle,
      type: lessonType,
      notesS3Key: s3Key,
      isFree: false,
      isFreePreview: false,
    },
  });

  await audit({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "Lesson",
    entityId: lesson.id,
    metadata: { lessonTitle, lessonType, courseId, s3Key, fileName, fileSize, contentType },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ uploadUrl, s3Key, lessonId: lesson.id, blockId: block.id }, { status: 201 });
}

const UpdateLessonSchema = z.object({
  lessonId: z.string().cuid(),
  s3Key: z.string().optional(),
  bunnyVideoId: z.string().optional(),
  durationSec: z.number().int().min(1).max(86400).optional(),
  transcript: z.string().max(50000).optional(),
  isFreePreview: z.boolean().optional(),
  isFree: z.boolean().optional(),
});

/** PATCH /api/tutor/materials - update a lesson after upload or toggle visibility */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "content.upload"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: (e as Error).message }, { status: 403 }); throw e; }

  const parsed = UpdateLessonSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const { lessonId, ...updates } = parsed.data;

  // Verify the tutor owns the course for this lesson
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { block: { select: { courseId: true } } },
  });
  if (!lesson) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  if (!await canAccessTeachingCourse(lesson.block.courseId, session.user.id))
    return NextResponse.json({ error: "You can only edit materials for your own courses." }, { status: 403 });

  const updated = await db.lesson.update({
    where: { id: lessonId },
    data: updates,
  });

  await audit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "Lesson",
    entityId: lessonId,
    metadata: updates,
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ lesson: updated });
}
