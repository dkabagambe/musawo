#!/usr/bin/env node
/**
 * scripts/fetch-images.mjs
 * Downloads placeholder photos from musawo.ug and converts them to WebP.
 * Run once during local setup: node scripts/fetch-images.mjs
 * All images are placeholders — replace with final licensed photos before launch.
 */

import { createWriteStream, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../public/assets/images");

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const IMAGES = [
  {
    url: "https://musawo.ug/wp-content/uploads/2026/08/DSC08758-copy-1.jpg",
    file: "hero-training.jpg",
    alt: "Musawo Training Center students in a hands-on nursing session",
    description: "Training / CNA course hero — PLACEHOLDER, replace with final photo",
  },
  {
    url: "https://musawo.ug/wp-content/uploads/yootheme/cache/d5/DSC_0506-1-d52d3bfc.png",
    file: "cna-course.png",
    alt: "Certified Nursing Care Assistant course participants",
    description: "CNA course card image — PLACEHOLDER",
  },
  {
    url: "https://musawo.ug/wp-content/uploads/yootheme/cache/e6/DSC_0506-e615acf3.png",
    file: "basic-nursing.png",
    alt: "Basic Nursing Care Assistant course participants",
    description: "Basic Nursing Care Assistant card — PLACEHOLDER",
  },
  {
    url: "https://musawo.ug/wp-content/uploads/yootheme/cache/23/adfa-dental-230a48d4.jpg",
    file: "graduates-clinic.jpg",
    alt: "ADFA clinic — Musawo graduates at work in a community health setting",
    description: "Graduates / what happens after section — PLACEHOLDER",
  },
  {
    url: "https://musawo.ug/wp-content/uploads/2026/05/DSC_0506-6.jpg",
    file: "community-care.jpg",
    alt: "Community care and placement — Musawo graduates serving households",
    description: "Community care / placement section — PLACEHOLDER",
  },
  {
    url: "https://musawo.ug/wp-content/uploads/2026/02/First-aid-training-city-Ambulance-Uganda.jpg",
    file: "first-aid-child-safety.jpg",
    alt: "First aid and child safety training in Kampala",
    description: "Child care and safety course card — PLACEHOLDER",
  },
  {
    url: "https://musawo.ug/wp-content/uploads/yootheme/cache/7f/musawo-logo-1-7fbde093.png",
    file: "musawo-logo-source.png",
    alt: "Musawo Training Center logo",
    description: "Source logo for favicon/header — PLACEHOLDER",
  },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const file = createWriteStream(dest);
    const req = client.get(url, { timeout: 15000, headers: { "User-Agent": "MTC-Setup/1.0" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    });
    req.on("error", (e) => { file.close(); reject(e); });
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

const manifest = [];

for (const img of IMAGES) {
  const dest = join(OUT, img.file);
  if (existsSync(dest)) {
    console.log(`  ✓ already exists: ${img.file}`);
    manifest.push({ ...img, status: "cached" });
    continue;
  }
  try {
    process.stdout.write(`  ↓ downloading ${img.file}…`);
    await download(img.url, dest);
    console.log(" done");
    manifest.push({ ...img, status: "downloaded" });
  } catch (err) {
    console.log(` FAILED (${err.message}) — gradient placeholder will be used`);
    manifest.push({ ...img, status: "failed", error: err.message });
  }
}

writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\n✅ Images manifest written to public/assets/images/manifest.json`);
console.log("⚠️  All downloaded images are PLACEHOLDERS — replace with final licensed photos before launch.\n");
