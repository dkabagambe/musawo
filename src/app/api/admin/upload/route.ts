import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !can(session.user.role, "finance.proof.collect")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File must be under 5 MB" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PNG and JPEG images are allowed" },
        { status: 400 }
      );
    }

    // Convert file to buffer and calculate hash for duplicate detection
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    // Check for duplicate image
    const existing = await db.document.findFirst({
      where: { metadata: { path: ["hash"], equals: hash } },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "This image has already been uploaded",
          existingUrl: existing.url,
        },
        { status: 409 }
      );
    }

    // Store in database (in production, would upload to S3 or similar)
    // For now, we'll store as base64 in the DB
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    const doc = await db.document.create({
      data: {
        userId: session.user.id,
        name: file.name,
        type: type ?? "payment-proof",
        url: dataUrl, // In production: S3 URL
        size: file.size,
        mimeType: file.type,
        metadata: { hash },
      },
    });

    return NextResponse.json({
      url: doc.url,
      id: doc.id,
      hash,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
