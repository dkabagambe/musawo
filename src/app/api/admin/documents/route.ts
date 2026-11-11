/**
 * GET    /api/admin/documents          - list student documents (student.documents.manage)
 * POST   /api/admin/documents          - request presigned upload URL + create record
 *
 * Gated by the student.documents.manage permission (ADMIN, PRINCIPAL, DIRECTOR).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { getPresignedUploadUrl } from "@/lib/s3";
import { z } from "zod";

/** GET: list student documents, optionally filtered by student */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user.role, "student.documents.manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const studentId = new URL(req.url).searchParams.get("student");

  const documents = await db.studentDocument.findMany({
    where: {
      deletedAt: null,
      ...(studentId ? { userId: studentId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, studentNumber: true } },
      uploadedBy: { select: { name: true } },
    },
  });

  return NextResponse.json({ documents });
}

// Allowed MIME types for student documents
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx",
]);

function isAllowedFile(mimeType: string, fileName: string): boolean {
  const ext = "." + (fileName.split(".").pop() ?? "").toLowerCase();
  return ALLOWED_MIME_TYPES.has(mimeType.toLowerCase()) || ALLOWED_EXTENSIONS.has(ext);
}

const CreateSchema = z.object({
  studentId: z.string().min(1),
  title: z.string().min(2).max(300),
  type: z.enum(["ID_SCAN", "ACADEMIC_CERT", "PHOTO", "MEDICAL", "OTHER"]).default("OTHER"),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(200),
  fileSize: z.number().int().positive().max(50 * 1024 * 1024).optional(), // 50 MB max
});

/** POST: create a document record and return a presigned upload URL */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user.role, "student.documents.manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { studentId, title, type, fileName, mimeType, fileSize } = parsed.data;

  // Server-side MIME/extension allowlist
  if (!isAllowedFile(mimeType, fileName)) {
    return NextResponse.json(
      { error: "File type not allowed. Accepted: PDF, JPG, PNG, WEBP, DOC, DOCX (max 50 MB)." },
      { status: 422 },
    );
  }

  // Verify the student exists
  const student = await db.user.findFirst({
    where: { id: studentId, role: "STUDENT" },
    select: { id: true, name: true },
  });
  if (!student)
    return NextResponse.json({ error: "Student not found" }, { status: 404 });

  // Generate S3 key
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const s3Key = `student-documents/${studentId}/${Date.now()}-${safeName}`;

  // Get presigned upload URL
  const uploadUrl = await getPresignedUploadUrl(s3Key, mimeType);

  // Create the document record
  const doc = await db.studentDocument.create({
    data: {
      userId: studentId,
      uploadedById: session.user.id,
      title,
      type,
      fileS3Key: s3Key,
      fileName,
      mimeType,
      fileSize,
    },
  });

  await audit({
    actorId: session.user.id,
    action: "STUDENT_DOCUMENT_UPLOADED",
    entityType: "StudentDocument",
    entityId: doc.id,
    metadata: { title, type, studentId, studentName: student.name, fileName },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ document: doc, uploadUrl }, { status: 201 });
}
