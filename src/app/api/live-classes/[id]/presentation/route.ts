/**
 * /api/live-classes/[id]/presentation
 *
 * GET  – list presentations for a live class (instructor: any status; student: LIVE or COMPLETED)
 * POST – instructor requests a presigned upload URL and registers the presentation record
 * DELETE – instructor removes a presentation (by ?presentationId=...)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, requirePermission, ForbiddenError } from "@/lib/rbac";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { getPresignedUploadUrl, getPresignedDownloadUrl, deleteObject } from "@/lib/s3";
import { audit } from "@/lib/audit";
import { z } from "zod";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf":                                                              "pdf",
  "application/vnd.ms-powerpoint":                                               "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":  "pptx",
  "image/png":  "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

// ─── GET: list presentations ───────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isInstructor = can(session.user.role, "classes.manage");
  const isStudent    = can(session.user.role, "classes.join");

  if (!isInstructor && !isStudent) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const liveClass = await db.liveClass.findUnique({
    where: { id: params.id },
    select: { id: true, courseId: true, status: true, tutorId: true },
  });
  if (!liveClass) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Students can only see presentations when class is LIVE or COMPLETED
  if (isStudent && !isInstructor) {
    if (!["LIVE", "COMPLETED"].includes(liveClass.status)) {
      return NextResponse.json({ presentations: [] });
    }
    // Check enrolment
    const enrolment = await db.enrolment.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId: liveClass.courseId } },
    });
    if (!enrolment || !["ACTIVE", "PARTIALLY_PAID", "COMPLETED"].includes(enrolment.status)) {
      return NextResponse.json({ error: "Enrolment required" }, { status: 403 });
    }
  }

  // Instructors must own the course
  if (isInstructor) {
    const owned = await db.liveClass.findFirst({
      where: { id: params.id, course: teachingCourseWhere(session.user.id) },
    });
    if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await db.classPresentation.findMany({
    where: { liveClassId: params.id },
    orderBy: { order: "asc" },
    select: { id: true, fileName: true, mimeType: true, sizeBytes: true, s3Key: true, order: true, createdAt: true },
  });

  // Build view URLs (never a download-forcing Content-Disposition)
  const presentations = await Promise.all(
    rows.map(async (p) => ({
      id: p.id,
      fileName: p.fileName,
      mimeType: p.mimeType,
      sizeBytes: p.sizeBytes,
      order: p.order,
      createdAt: p.createdAt.toISOString(),
      viewUrl: await getPresignedDownloadUrl(p.s3Key, 3600),
    }))
  );

  return NextResponse.json({ presentations });
}

// ─── POST: request upload URL + register record ────────────────────────────

const UploadSchema = z.object({
  fileName:  z.string().min(1).max(200),
  mimeType:  z.string().refine((v) => v in ALLOWED_TYPES, { message: "File type not allowed" }),
  sizeBytes: z.number().int().positive().max(MAX_BYTES, { message: "File too large (max 50 MB)" }),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try { requirePermission(session.user.role, "classes.manage"); }
  catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    throw error;
  }

  const liveClass = await db.liveClass.findFirst({
    where: { id: params.id, course: teachingCourseWhere(session.user.id) },
    select: { id: true, status: true },
  });
  if (!liveClass) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["SCHEDULED", "LIVE"].includes(liveClass.status)) {
    return NextResponse.json({ error: "Presentations can only be added before or during a class" }, { status: 409 });
  }

  const body = UploadSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[body.data.mimeType];
  const s3Key = `presentations/${params.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Count existing presentations for order
  const count = await db.classPresentation.count({ where: { liveClassId: params.id } });

  const record = await db.classPresentation.create({
    data: {
      liveClassId: params.id,
      uploadedBy:  session.user.id,
      fileName:    body.data.fileName,
      s3Key,
      mimeType:    body.data.mimeType,
      sizeBytes:   body.data.sizeBytes,
      order:       count,
    },
    select: { id: true, s3Key: true, fileName: true, order: true },
  });

  const uploadUrl = await getPresignedUploadUrl(s3Key, body.data.mimeType, 900);

  await audit({
    actorId:    session.user.id,
    action:     "CREATE",
    entityType: "ClassPresentation",
    entityId:   record.id,
    metadata:   { liveClassId: params.id, fileName: body.data.fileName },
  });

  return NextResponse.json({ id: record.id, uploadUrl, s3Key, order: record.order }, { status: 201 });
}

// ─── DELETE: remove a presentation ────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try { requirePermission(session.user.role, "classes.manage"); }
  catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    throw error;
  }

  const presentationId = new URL(req.url).searchParams.get("presentationId");
  if (!presentationId) return NextResponse.json({ error: "presentationId required" }, { status: 400 });

  const liveClass = await db.liveClass.findFirst({
    where: { id: params.id, course: teachingCourseWhere(session.user.id) },
    select: { id: true },
  });
  if (!liveClass) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const record = await db.classPresentation.findFirst({
    where: { id: presentationId, liveClassId: params.id },
    select: { id: true, s3Key: true },
  });
  if (!record) return NextResponse.json({ error: "Presentation not found" }, { status: 404 });

  await db.classPresentation.delete({ where: { id: record.id } });
  await deleteObject(record.s3Key).catch(() => undefined); // best-effort

  await audit({
    actorId:    session.user.id,
    action:     "DELETE",
    entityType: "ClassPresentation",
    entityId:   record.id,
    metadata:   { liveClassId: params.id },
  });

  return NextResponse.json({ ok: true });
}
