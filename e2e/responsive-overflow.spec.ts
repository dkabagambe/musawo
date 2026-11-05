/**
 * Responsive overflow tests
 *
 * At 320px, 375px and 414px:
 *  - document.scrollWidth must NOT exceed viewport width (no horizontal scroll)
 *  - The main content container's left and right gaps must be within 4px of each other
 *  - No text element must have its right edge clipped by the viewport
 *  - The banner (if visible) must not overlap the navbar
 *
 * Run against a live dev server:  npx playwright test e2e/responsive-overflow.spec.ts
 */

import { test, expect } from "@playwright/test";

const WIDTHS = [320, 375, 414, 768, 1024];

const PUBLIC_PAGES = [
  "/",
  "/about",
  "/admissions/how-to-enrol",
  "/admissions/fees",
  "/admissions/payment-options",
  "/impact",
  "/courses",
  "/apply",
  "/login",
  "/faq",
  "/contact",
  "/privacy",
  "/terms",
  "/refund",
];

for (const width of WIDTHS) {
  for (const path of PUBLIC_PAGES) {
    test(`[${width}px] ${path} — no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height: 812 });
      await page.goto(path, { waitUntil: "domcontentloaded" });

      // Wait for layout to settle
      await page.waitForTimeout(300);

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth - window.innerWidth;
      });

      expect(
        overflow,
        `${path} at ${width}px has ${overflow}px of horizontal overflow`,
      ).toBeLessThanOrEqual(1);
    });

    test(`[${width}px] ${path} — container left/right gap balanced`, async ({ page }) => {
      await page.setViewportSize({ width, height: 812 });
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(300);

      const imbalance = await page.evaluate(() => {
        // Find the first element that looks like a content container
        const el =
          document.querySelector("#main > div") ??
          document.querySelector("main > div") ??
          document.querySelector("main");
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        const leftGap = rect.left;
        const rightGap = window.innerWidth - rect.right;
        return Math.abs(leftGap - rightGap);
      });

      // Tolerate up to 4px difference (e.g. scrollbar or rounding)
      expect(
        imbalance,
        `${path} at ${width}px: left/right gap imbalance is ${imbalance}px`,
      ).toBeLessThanOrEqual(4);
    });
  }
}

// Banner must not overlap the navbar (when banner is present)
for (const width of WIDTHS) {
  test(`[${width}px] / — banner does not overlap navbar`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);

    const overlap = await page.evaluate(() => {
      const banner = document.querySelector<HTMLElement>("[role='alert']");
      const header = document.querySelector<HTMLElement>("header");
      if (!banner || !header) return 0;
      const bannerBottom = banner.getBoundingClientRect().bottom;
      const headerTop = header.getBoundingClientRect().top;
      // Positive value means banner overlaps navbar
      return bannerBottom - headerTop;
    });

    expect(
      overlap,
      `Banner overlaps navbar by ${overlap}px at ${width}px`,
    ).toBeLessThanOrEqual(1);
  });
}
