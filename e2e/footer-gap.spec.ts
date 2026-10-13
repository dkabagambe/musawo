/**
 * E2E test: no unexpected white gap between the last content section
 * and the footer on any public page.
 *
 * Measures: footer.top - lastSection.bottom
 * Asserts:  gap <= 120 px (allows for normal section bottom-padding but
 *           catches the ~175 px empty-space regression from pb-20+pb-24).
 *
 * Also asserts footer uses brand teal (not near-black).
 *
 * Prerequisites:
 *   - Dev server running on http://localhost:3000
 *
 * Run: npx playwright test e2e/footer-gap.spec.ts
 */

import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

const PUBLIC_PAGES = [
  "/",
  "/courses",
  "/about",
  "/faq",
  "/resources",
  "/contact",
  "/scholarships",
  "/privacy",
  "/terms",
  "/refund",
];

const VIEWPORTS = [
  { name: "390px mobile",  width: 390,  height: 844  },
  { name: "768px tablet",  width: 768,  height: 1024 },
  { name: "1440px desktop", width: 1440, height: 900  },
  { name: "1920px wide",   width: 1920, height: 1080 },
];

/** Maximum allowed gap (px) between last section bottom and footer top. */
const MAX_GAP_PX = 120;

for (const vp of VIEWPORTS) {
  test.describe(`Gap check @ ${vp.name}`, () => {
    for (const path of PUBLIC_PAGES) {
      test(`${path} — no gap > ${MAX_GAP_PX}px above footer`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE}${path}`);

        // Scroll to bottom to ensure all lazy-rendered elements are in DOM
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(300);

        const footerBox = await page.locator("footer").boundingBox();
        expect(footerBox, "footer not found").not.toBeNull();

        // Find the element immediately before the footer in DOM order
        const gapPx = await page.evaluate(() => {
          const footer = document.querySelector("footer");
          if (!footer) return 0;

          // Walk backwards through siblings to find the last visible element
          let prev = footer.previousElementSibling as HTMLElement | null;
          while (prev) {
            const rect = prev.getBoundingClientRect();
            const style = window.getComputedStyle(prev);
            if (
              rect.height > 0 &&
              style.display !== "none" &&
              style.visibility !== "hidden"
            ) {
              const footerRect = footer.getBoundingClientRect();
              // Both rects are relative to viewport; use document offsets for accuracy
              const footerTop = footerRect.top + window.scrollY;
              const prevBottom = rect.bottom + window.scrollY;
              return footerTop - prevBottom;
            }
            prev = prev.previousElementSibling as HTMLElement | null;
          }
          return 0;
        });

        expect(
          gapPx,
          `${path} @ ${vp.name}: gap between last section and footer is ${gapPx}px (max ${MAX_GAP_PX}px). Check for pb-* on <main>, a wrapper div, or an empty/invisible section.`,
        ).toBeLessThanOrEqual(MAX_GAP_PX);
      });
    }
  });
}

test.describe("Footer colour — brand teal, not near-black", () => {
  test("footer background is brand teal on homepage", async ({ page }) => {
    await page.goto(`${BASE}/`);
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    const bg = await footer.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    );

    // bg is "rgb(r, g, b)". Brand teal #0B6B5D = rgb(11, 107, 93).
    // We check it is NOT near-black (all channels < 30) and IS teal-ish
    // (green channel dominant, moderate value).
    const match = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    expect(match, `Could not parse footer bg: ${bg}`).not.toBeNull();
    if (match) {
      const [, r, g, b] = match.map(Number);
      // Not near-black: at least one channel >= 50
      expect(
        Math.max(r, g, b),
        `Footer looks near-black: ${bg}`,
      ).toBeGreaterThanOrEqual(50);
      // Teal: green channel is the dominant/largest
      expect(g, `Footer green channel should dominate teal: ${bg}`).toBeGreaterThan(r);
      expect(g, `Footer green channel should dominate teal: ${bg}`).toBeGreaterThan(b);
    }
  });
});
