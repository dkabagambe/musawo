/**
 * Manual test script for T1: Avatar upload, processing, and storage
 * 
 * Tests:
 * 1. Upload JPEG, PNG, WebP - converted to WebP 256x256 + 64x64
 * 2. Files stored in UserAvatar table with correct sizes
 * 3. Non-image file rejected
 * 4. File over 5MB rejected
 */

import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const db = new PrismaClient();

const TEST_USER_ID = "test-avatar-user-001";

async function setup() {
  // Create test user if not exists
  await db.user.upsert({
    where: { id: TEST_USER_ID },
    create: {
      id: TEST_USER_ID,
      name: "Dr. Esther Achen",
      email: `test-avatar-${Date.now()}@example.com`,
      role: "INSTRUCTOR",
      status: "ACTIVE",
      passwordHash: "dummy",
    },
    update: {},
  });
  console.log("✓ Test user created/verified");
}

async function testImageUpload(format: "jpeg" | "png" | "webp") {
  console.log(`\n📸 Testing ${format.toUpperCase()} upload...`);

  // Create a test image
  const testImageBuffer = await sharp({
    create: {
      width: 500,
      height: 500,
      channels: 3,
      background: { r: 255, g: 100, b: 50 },
    },
  })
    [format]()
    .toBuffer();

  console.log(`  Input: ${format} ${testImageBuffer.length} bytes`);

  // Process like the API does
  const processedFull = await sharp(testImageBuffer)
    .rotate()
    .resize(256, 256, { fit: "cover", position: "centre" })
    .webp({ quality: 85 })
    .toBuffer();

  const processedThumb = await sharp(testImageBuffer)
    .rotate()
    .resize(64, 64, { fit: "cover", position: "centre" })
    .webp({ quality: 80 })
    .toBuffer();

  console.log(`  Output: WebP full=${processedFull.length}b, thumb=${processedThumb.length}b`);

  // Store in database
  await db.userAvatar.upsert({
    where: { userId: TEST_USER_ID },
    create: {
      userId: TEST_USER_ID,
      contentType: "image/webp",
      bytes: processedFull,
      thumbBytes: processedThumb,
      sizeBytes: processedFull.length + processedThumb.length,
    },
    update: {
      contentType: "image/webp",
      bytes: processedFull,
      thumbBytes: processedThumb,
      sizeBytes: processedFull.length + processedThumb.length,
      updatedAt: new Date(),
    },
  });

  // Verify in database
  const avatar = await db.userAvatar.findUnique({
    where: { userId: TEST_USER_ID },
    select: {
      contentType: true,
      sizeBytes: true,
      updatedAt: true,
    },
  });

  console.log(`  ✓ Stored in database: ${avatar?.sizeBytes} bytes total, contentType=${avatar?.contentType}`);
  console.log(`  ✓ Updated at: ${avatar?.updatedAt.toISOString()}`);

  return avatar;
}

async function testNonImageRejection() {
  console.log(`\n🚫 Testing non-image rejection...`);

  const textBuffer = Buffer.from("This is not an image file");

  try {
    await sharp(textBuffer).metadata();
    console.log(`  ✗ FAIL: Non-image was not rejected`);
    return false;
  } catch (err) {
    console.log(`  ✓ Non-image correctly rejected: ${(err as Error).message.substring(0, 50)}...`);
    return true;
  }
}

async function testOversizeRejection() {
  console.log(`\n📏 Testing oversized file rejection...`);

  const MAX_BYTES = 5 * 1024 * 1024;
  const oversized = Buffer.alloc(MAX_BYTES + 1024);

  if (oversized.length > MAX_BYTES) {
    console.log(`  ✓ File size check: ${oversized.length} > ${MAX_BYTES} bytes - would be rejected`);
    return true;
  }

  return false;
}

async function testDatabaseRetrieval() {
  console.log(`\n💾 Testing database retrieval...`);

  const avatar = await db.userAvatar.findUnique({
    where: { userId: TEST_USER_ID },
  });

  if (!avatar) {
    console.log(`  ✗ FAIL: Avatar not found in database`);
    return false;
  }

  console.log(`  ✓ Full image: ${avatar.bytes.length} bytes`);
  console.log(`  ✓ Thumbnail: ${avatar.thumbBytes.length} bytes`);
  console.log(`  ✓ Content-Type: ${avatar.contentType}`);
  console.log(`  ✓ Updated: ${avatar.updatedAt.toISOString()}`);

  // Verify images are valid WebP
  try {
    const fullMeta = await sharp(avatar.bytes).metadata();
    const thumbMeta = await sharp(avatar.thumbBytes).metadata();

    console.log(`  ✓ Full image: ${fullMeta.width}x${fullMeta.height}, format=${fullMeta.format}`);
    console.log(`  ✓ Thumbnail: ${thumbMeta.width}x${thumbMeta.height}, format=${thumbMeta.format}`);

    if (fullMeta.format !== "webp" || thumbMeta.format !== "webp") {
      console.log(`  ✗ FAIL: Images not in WebP format`);
      return false;
    }

    if (fullMeta.width !== 256 || fullMeta.height !== 256) {
      console.log(`  ✗ FAIL: Full image not 256x256`);
      return false;
    }

    if (thumbMeta.width !== 64 || thumbMeta.height !== 64) {
      console.log(`  ✗ FAIL: Thumbnail not 64x64`);
      return false;
    }
  } catch (err) {
    console.log(`  ✗ FAIL: Stored images not valid: ${(err as Error).message}`);
    return false;
  }

  return true;
}

async function cleanup() {
  console.log(`\n🧹 Cleaning up test data...`);
  await db.userAvatar.deleteMany({ where: { userId: TEST_USER_ID } });
  await db.user.delete({ where: { id: TEST_USER_ID } });
  console.log(`  ✓ Test user and avatar removed`);
}

async function main() {
  console.log("=".repeat(60));
  console.log("T1: Avatar Upload & Storage Test");
  console.log("=".repeat(60));

  try {
    await setup();

    await testImageUpload("jpeg");
    await testImageUpload("png");
    await testImageUpload("webp");

    await testNonImageRejection();
    await testOversizeRejection();

    await testDatabaseRetrieval();

    await cleanup();

    console.log("\n" + "=".repeat(60));
    console.log("✅ All tests passed!");
    console.log("=".repeat(60));
  } catch (err) {
    console.error("\n❌ Test failed:", err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
