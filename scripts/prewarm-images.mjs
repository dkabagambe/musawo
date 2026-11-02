/**
 * Pre-warm Next.js image cache at build/deploy time.
 *
 * Runs with: node scripts/prewarm-images.mjs
 *
 * Generates optimised AVIF/WebP variants for all static hero and course
 * images into public/assets/ so the browser receives them directly without
 * going through /_next/image on first load.
 *
 * This is NOT a replacement for Next.js image optimization — it simply
 * ensures the most important images are tiny on disk before deployment.
 */

import sharp from "sharp";
import { readdir, stat, writeFile } from "fs/promises";
import { join, extname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");

// Images that need to be available immediately (LCP + above-fold)
const PRIORITY = [
  "public/assets/images/hero-training.jpg",
  "public/assets/images/musawo-session.webp",
  "public/assets/images/graduates-clinic.jpg",
  "public/assets/images/hero-about.webp",
  "public/assets/images/hero-courses.webp",
];

// Max width for public-facing images — browser will further resize via srcset
const MAX_W = 1280;
const QUALITY = 78;

async function optimise(relPath) {
  const src = join(ROOT, relPath);
  const info = await stat(src);
  const ext = extname(relPath);
  const base = basename(relPath, ext);
  const dir = relPath.replace(/\/[^/]+$/, "");
  const dst = join(ROOT, dir, base + ".webp");

  // Skip if the output webp already exists and is newer than the source
  try {
    const dstStat = await stat(dst);
    if (dstStat.mtimeMs >= info.mtimeMs && dst !== src) {
      console.log(`skip (up to date): ${relPath}`);
      return;
    }
  } catch {
    // dst doesn't exist yet — proceed
  }

  const result = await sharp(src)
    .resize({ width: MAX_W, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(dst);

  console.log(
    `${relPath} -> ${base}.webp  ${Math.round(info.size / 1024)}KB -> ${Math.round(result.size / 1024)}KB`
  );
}

async function main() {
  console.log("Pre-warming images…");
  await Promise.all(PRIORITY.map(optimise));
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
