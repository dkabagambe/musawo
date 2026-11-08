/**
 * GET    /api/admin/documents/[id]  - serve a document file inline (student.documents.manage)
 * DELETE /api/admin/documents/[id]  - soft-delete a document (student.documents.manage)
 *
 * Files are streamed through the app so S3 keys/credentials are never exposed.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { getInlineObject, deleteObject } from "@/lib/s3";

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
