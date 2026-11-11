/**
 * GET    /api/admin/documents/[id]  - serve a document file inline (student.documents.manage)
 * DELETE /api/admin/documents/[id]  - soft-delete a document (student.documents.manage)
 * PATCH  /api/admin/documents/[id]  - replace the file for a document (student.documents.manage)
 *
 * Files are streamed through the app so S3 keys/credentials are never exposed.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { getInlineObject, deleteObject, getPresignedUploadUrl } from "@/lib/s3";
import { z } from "zod";

/** GET: serve the file inline (view in browser, no download link exposed) */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user.role, "student.documents.manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const doc = await db.studentDocument.findUnique({
    where: { id: params.id, deletedAt: null },
  });
  if (!doc)
    return NextResponse.json({ error: "Document not found" }, { status: 404 });

  try {
    const { body, contentType, contentLength } = await getInlineObject(doc.fileS3Key);
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    if (contentLength) headers.set("Content-Length", String(contentLength));
    // Inline disposition so the browser displays rather than downloads
    headers.set("Content-Disposition", `inline; filename="${doc.fileName ?? doc.title}"`);

    return new NextResponse(body as ReadableStream<Uint8Array>, { headers });
  } catch {
    return NextResponse.json(
      { error: "File could not be retrieved. It may not have been uploaded yet." },
      { status: 404 },
    );
  }
}

/** DELETE: soft-delete a document */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user.role, "student.documents.manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const doc = await db.studentDocument.findUnique({
    where: { id: params.id, deletedAt: null },
  });
  if (!doc)
    return NextResponse.json({ error: "Document not found" }, { status: 404 });

  await db.studentDocument.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  });

  // Attempt to delete the S3 object as well (non-blocking)
  try {
    await deleteObject(doc.fileS3Key);
  } catch {
    // S3 deletion failed — the DB record is soft-deleted so it won't show in the UI
  }

  await audit({
    actorId: session.user.id,
    action: "STUDENT_DOCUMENT_DELETED",
    entityType: "StudentDocument",
    entityId: doc.id,
    metadata: { title: doc.title, studentId: doc.userId },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}

/**
 * PATCH /api/admin/documents/[id]
 * Replace the file for an existing document record.
 * Returns a new presigned upload URL; the S3 key changes.
 */
const ReplaceSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(200),
  fileSize: z.number().int().positive().max(50 * 1024 * 1024).optional(),
  title: z.string().min(2).max(300).optional(),
});

// Allowed MIME types (kept in sync with the POST route above)
const PATCH_ALLOWED_MIME = new Set([
  "application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const PATCH_ALLOWED_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "student.documents.manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const doc = await db.studentDocument.findUnique({
    where: { id: params.id, deletedAt: null },
  });
  if (!doc)
    return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const parsed = ReplaceSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const { fileName, mimeType, fileSize, title } = parsed.data;

  // MIME allowlist check
  const ext = "." + (fileName.split(".").pop() ?? "").toLowerCase();
  if (!PATCH_ALLOWED_MIME.has(mimeType.toLowerCase()) && !PATCH_ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      { error: "File type not allowed. Accepted: PDF, JPG, PNG, WEBP, DOC, DOCX (max 50 MB)." },
      { status: 422 },
    );
  }

  // New S3 key (old file will be orphaned; delete asynchronously)
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const newS3Key = `student-documents/${doc.userId}/${Date.now()}-replace-${safeName}`;
  const uploadUrl = await getPresignedUploadUrl(newS3Key, mimeType);

  const updates: Record<string, unknown> = {
    fileS3Key: newS3Key,
    fileName,
    mimeType,
    ...(fileSize !== undefined ? { fileSize } : {}),
    ...(title ? { title } : {}),
  };
  await db.studentDocument.update({ where: { id: params.id }, data: updates });

  // Best-effort: delete the old S3 object (non-blocking)
  try { await deleteObject(doc.fileS3Key); } catch { /* ignore */ }

  await audit({
    actorId: session.user.id,
    action: "STUDENT_DOCUMENT_UPLOADED",
    entityType: "StudentDocument",
    entityId: doc.id,
    metadata: { action: "replace", title: title ?? doc.title, fileName, studentId: doc.userId },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true, uploadUrl, s3Key: newS3Key });
}
