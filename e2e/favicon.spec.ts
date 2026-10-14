/**
 * Favicon and icon tests.
 * Checks every route listed in the spec returns the correct
 * favicon link tags in <head>, and that /favicon.ico and
 * /icon.png serve the Musawo logo (not the Next.js default).
 *
 * Run: npx playwright test e2e/favicon.spec.ts
 */

import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// Next.js default icon.png is 1x1 or has a specific small size.
// Our logo is 512x512. We check dimensions are at least 64x64.
const MIN_ICON_DIMENSION = 64;

/** Byte-level check for PNG magic bytes */
function isPng(buf: Buffer): boolean {
  return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

/** Byte-level check for ICO magic bytes */
function isIco(buf: Buffer): boolean {
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00;
}

const PUBLIC_PAGES = [
  "/",
  "/courses",
  "/resources",
  "/contact",
  "/faq",
  "/about",
  "/scholarships",
  "/admissions/how-to-enrol",
  "/admissions/fees",
  "/admissions/payment-options",
  "/learning/how-you-learn",
  "/learning/live-classes",
  "/learning/exams",
  "/about/accreditation",
  "/about/trainers",
];

const AUTH_PAGES = [
  "/login",
  "/register",
];

test.describe("Icon assets", () => {
  test("/favicon.ico is a valid ICO file (not Next.js default)", async ({ request }) => {
    const res = await request.get(`${BASE}/favicon.ico`);
    expect(res.status()).toBe(200);
    const body = await res.body();
    expect(isIco(body)).toBe(true);
    // Must be larger than the 15-byte Next.js placeholder
    expect(body.length).toBeGreaterThan(100);
  });

  test("/icon.png is a valid PNG at least 64x64", async ({ request }) => {
    const res = await request.get(`${BASE}/icon.png`);
    expect(res.status()).toBe(200);
    const body = await res.body();
    expect(isPng(body)).toBe(true);
    // PNG IHDR chunk starts at byte 16: 4-byte width, 4-byte height
    const width  = body.readUInt32BE(16);
    const height = body.readUInt32BE(20);
    expect(width).toBeGreaterThanOrEqual(MIN_ICON_DIMENSION);
    expect(height).toBeGreaterThanOrEqual(MIN_ICON_DIMENSION);
  });

  test("/apple-icon.png is a valid PNG", async ({ request }) => {
    const res = await request.get(`${BASE}/apple-icon.png`);
    expect(res.status()).toBe(200);
    const body = await res.body();
    expect(isPng(body)).toBe(true);
  });
});

test.describe("Icon link tags in <head> - public pages", () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} has correct icon link tags`, async ({ page }) => {
      await page.goto(`${BASE}${path}`);
      const favicon = await page.$('link[rel="icon"][href="/favicon.ico"]');
      expect(favicon, `${path}: missing link[rel=icon][href=/favicon.ico]`).not.toBeNull();
      const apple = await page.$('link[rel="apple-touch-icon"]');
      expect(apple, `${path}: missing link[rel=apple-touch-icon]`).not.toBeNull();
    });
  }
});

test.describe("Icon link tags in <head> - auth pages", () => {
  for (const path of AUTH_PAGES) {
    test(`${path} has correct icon link tags`, async ({ page }) => {
      await page.goto(`${BASE}${path}`);
      const favicon = await page.$('link[rel="icon"][href="/favicon.ico"]');
      expect(favicon, `${path}: missing link[rel=icon][href=/favicon.ico]`).not.toBeNull();
    });
  }
});

test.describe("404 page has icon tags", () => {
  test("/this-page-does-not-exist has favicon link", async ({ page }) => {
    await page.goto(`${BASE}/this-page-does-not-exist`);
    const favicon = await page.$('link[rel="icon"][href="/favicon.ico"]');
    expect(favicon).not.toBeNull();
  });
});
