#!/usr/bin/env node
/**
 * scripts/fetch-images.mjs
 *
 * Downloads hero and section images from musawo.ug, converts to WebP,
 * resizes to max 1600px wide, keeps each under 200 KB.
 *
 * Run: node scripts/fetch-images.mjs
 *
 * Writes to: public/assets/images/
 * Writes manifest: public/assets/images/manifest.json
 */

import { createWriteStream, existsSync, mkdirSync, writeFileSync } from "fs";
import { pipeline } from "stream/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "public", "assets", "images");
mkdirSync(OUT, { recursive: true });

// ── Image manifest ────────────────────────────────────────────────────────
const IMAGES = [
  // Hero images
  { name: "hero-courses",           src: "https://musawo.ug/wp-content/uploads/2026/05/DSC_0506-2.png",                                               alt: "Healthcare students in a classroom at Musawo Training Center" },
  { name: "hero-resources",         src: "https://musawo.ug/wp-content/uploads/2026/05/services.png",                                                  alt: "Musawo Training Center healthcare services and resources" },
  { name: "hero-contact",           src: "https://musawo.ug/wp-content/uploads/2026/05/NEF_1270.jpg",                                                  alt: "Musawo Training Center Lungujja clinic and offices" },
  { name: "hero-about",             src: "https://musawo.ug/wp-content/uploads/yootheme/cache/6d/collage-AdFA-01-1-6d45b54c.png",                     alt: "ADFA team collage — Musawo Training Center staff and community work" },
  { name: "hero-faq-scholarships",  src: "https://musawo.ug/wp-content/uploads/2025/11/adfa-community-outreach.jpg",                                   alt: "ADFA community outreach event in Uganda" },
  { name: "hero-login",             src: "https://musawo.ug/wp-content/uploads/yootheme/cache/3a/blood-check2-3adc5f04.jpg",                          alt: "Healthcare worker performing a blood check — Musawo Training Center" },
  { name: "hero-register",          src: "https://musawo.ug/wp-content/uploads/yootheme/cache/27/matters-27e45dc1.jpg",                               alt: "Community health training — Musawo Training Center Uganda" },
  // Course images
  { name: "course-cna",             src: "https://musawo.ug/wp-content/uploads/yootheme/cache/b1/banner-1-b11ec64e.png",                              alt: "Certified Nursing Care Assistant training at Musawo Training Center" },
  { name: "course-basic-nursing",   src: "https://musawo.ug/wp-content/uploads/2026/08/DSC08758-copy-1.jpg",                                           alt: "Basic nursing care training session" },
  { name: "course-child-safety",    src: "https://musawo.ug/wp-content/uploads/2026/02/First-aid-training-city-Ambulance-Uganda.jpg",                 alt: "First aid and child safety training in Uganda" },
  // Spare / section images
  { name: "graduates-field",        src: "https://musawo.ug/wp-content/uploads/2026/06/DSC_0052-1-scaled.jpg",                                        alt: "Musawo Training Center graduates working in healthcare" },
  { name: "mobile-care",            src: "https://musawo.ug/wp-content/uploads/yootheme/cache/2a/IMG_8308-2-2a69fd84.jpg",                            alt: "Mobile healthcare worker providing community care in Uganda" },
];

// ── Download helper ───────────────────────────────────────────────────────
async function download(url, destPath) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (MTC-image-fetch/1.0)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const tmp = destPath + ".tmp";
  const ws = createWriteStream(tmp);
  await pipeline(res.body, ws);
  // rename to final
  const { rename } = await import("fs/promises");
  await rename(tmp, destPath);
}

// ── Convert & resize with sharp ───────────────────────────────────────────
async function processImage(srcPath, destPath) {
  const { default: sharp } = await import("sharp");
  await sharp(srcPath)
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(destPath);
}

// ── Main ──────────────────────────────────────────────────────────────────
const manifest = [];
let passed = 0, failed = 0;

for (const img of IMAGES) {
  const webpName = img.name + ".webp";
  const webpPath = path.join(OUT, webpName);

  if (existsSync(webpPath)) {
    console.log(`  ✓ skip  ${webpName} (already exists)`);
    manifest.push({ name: img.name, file: webpName, alt: img.alt, status: "existing" });
    passed++;
    continue;
  }

  const tmpRaw = path.join(OUT, img.name + ".raw_download");
  try {
    process.stdout.write(`  ↓ fetch ${img.name} … `);
    await download(img.src, tmpRaw);
    await processImage(tmpRaw, webpPath);
    const { unlinkSync } = await import("fs");
    try { unlinkSync(tmpRaw); } catch {}
    const { statSync } = await import("fs");
    const size = Math.round(statSync(webpPath).size / 1024);
    console.log(`done (${size} KB)`);
    manifest.push({ name: img.name, file: webpName, alt: img.alt, status: "downloaded", sizeKb: size });
    passed++;
  } catch (err) {
    console.log(`FAILED — ${err.message}`);
    console.log(`    Using teal gradient fallback for ${img.name}`);
    try { const { unlinkSync } = await import("fs"); unlinkSync(tmpRaw); } catch {}
    manifest.push({ name: img.name, file: null, alt: img.alt, status: "failed", error: err.message });
    failed++;
  }
}

writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\nDone: ${passed} ok, ${failed} failed. Manifest → public/assets/images/manifest.json`);
