/**
 * POST /api/system/storage/test - Test storage upload and signed URL
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";

export async function POST() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.S3_ENDPOINT) {
    return NextResponse.json({
      success: false,
      error: "Storage not configured (S3_ENDPOINT not set)",
    }, { status: 503 });
  }

  try {
    const { S3Client, PutObjectCommand, GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

    const s3 = new S3Client({
      region: process.env.S3_REGION ?? "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      },
      forcePathStyle: true,
    });

    const testKey = `test/${Date.now()}-storage-test.txt`;
    const testContent = `Storage test at ${new Date().toISOString()}`;

    // Test upload
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET ?? "mtc-files",
        Key: testKey,
        Body: testContent,
      })
    );

    // Test signed URL generation
    const signedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET ?? "mtc-files",
        Key: testKey,
      }),
      { expiresIn: 60 }
    );

    return NextResponse.json({
      success: true,
      message: "Storage test successful. Upload and signed URL generation working.",
      signedUrl: signedUrl.split("?")[0] + "?...", // Hide query params
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Storage test failed",
    }, { status: 500 });
  }
}
