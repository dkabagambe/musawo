import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { getPresignedUploadUrl, deleteObject } from "@/lib/s3";

interface Props { params: { id: string } }

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/**
 * GET  - returns a pre-signed upload URL for the admin to upload the flyer directly to S3.
 * DELETE - removes the flyer.
 */
export async function GET(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  requirePermission(session.user.role, "courses.edit");

  const { searchParams } = new URL(req.url);
  const contentType = searchParams.get("contentType") ?? "application/pdf";

  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: "Unsupported file type. Use JPEG, PNG, WEBP or PDF." }, { status: 400 });
  }

  const ext = contentType === "application/pdf" ? "pdf"
    : contentType === "image/png" ? "png"
    : contentType === "image/webp" ? "webp"
    : "jpg";

  const key = `flyers/${params.id}.${ext}`;
  const uploadUrl = await getPresignedUploadUrl(key, contentType, 600);

  return NextResponse.json({ uploadUrl, key });
}

export async function POST(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  requirePermission(session.user.role, "courses.edit");

  const body = (await req.json()) as { key: string };
  if (!body.key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const course = await db.course.findUnique({ where: { id: params.id }, select: { flyerS3Key: true } });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  // Remove previous flyer if different key
  if (course.flyerS3Key && course.flyerS3Key !== body.key) {
    await deleteObject(course.flyerS3Key).catch(() => null);
  }

  await db.course.update({ where: { id: params.id }, data: { flyerS3Key: body.key } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  requirePermission(session.user.role, "courses.edit");

  const course = await db.course.findUnique({ where: { id: params.id }, select: { flyerS3Key: true } });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  if (course.flyerS3Key) {
    await deleteObject(course.flyerS3Key).catch(() => null);
    await db.course.update({ where: { id: params.id }, data: { flyerS3Key: null } });
  }

  return NextResponse.json({ ok: true });
}
