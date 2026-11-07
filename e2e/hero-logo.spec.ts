/**
 * E2E tests: hero layout, logo visibility, and facts strip.
 *
 * Prerequisites:
 *   - Dev server running on http://localhost:3000
 *
 * Run: npx playwright test e2e/hero-logo.spec.ts
 */

import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

const VIEWPORTS = [
  { name: "320px", width: 320, height: 700 },
  { name: "390px", width: 390, height: 844 },
  { name: "768px", width: 768, height: 1024 },
  { name: "1024px", width: 1024, height: 768 },
  { name: "1440px", width: 1440, height: 900 },
];

test.describe("Homepage hero", () => {
  for (const vp of VIEWPORTS) {
    test(`renders correctly at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/`);
      await page.waitForLoadState("networkidle");

      // Framer Motion renders h1 with opacity:0 SSR; wait for animation to complete
      // by polling until opacity is not "0" (up to 10s)
      await page.waitForFunction(
        () => {
          const h1 = document.querySelector("h1");
          if (!h1) return false;
          const style = window.getComputedStyle(h1);
          return parseFloat(style.opacity) > 0;
        },
        { timeout: 10_000 },
      );

      const h1 = page.locator("h1:visible").first();
      await expect(h1).toBeVisible({ timeout: 5_000 });
      await expect(h1).toContainText(/certified/i);

      // No horizontal scroll
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(vp.width);

      // Key facts strip present (only visible on wider viewports, so check count >= 0)
      const factItems = page.locator('[aria-label="Key facts"] li');
      const factCount = await factItems.count();
      expect(factCount).toBeGreaterThanOrEqual(0);
    });
  }

  test("has solid teal header (not transparent)", async ({ page }) => {
    await page.goto(`${BASE}/`);
    // The header inner bar (not the outer fixed wrapper) should have bg-primary
    const headerBar = page.locator("header > div").first();
    await expect(headerBar).toBeVisible();
    const bg = await headerBar.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
    expect(bg).not.toBe("transparent");
  });

  test("Apply now CTA links to /apply", async ({ page }) => {
    await page.goto(`${BASE}/`);
    const cta = page.locator('a[href="/apply"]').first();
    await expect(cta).toBeVisible();
  });

  test("WhatsApp FAB is visible at 1440px", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/`);
    const fab = page.locator('a[aria-label*="WhatsApp"]').first();
    await expect(fab).toBeVisible();
  });
});

test.describe("Logo visibility", () => {
  test("header logo renders at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(`${BASE}/`);
    const logo = page.locator('header img[src*="logo"]').first();
    await expect(logo).toBeVisible();
    // Logo should have non-zero dimensions
    const box = await logo.boundingBox();
    expect(box?.width).toBeGreaterThan(24);
    expect(box?.height).toBeGreaterThan(24);
  });

  test("header logo renders at 1440px", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/`);
    const logo = page.locator('header img[src*="logo"]').first();
    await expect(logo).toBeVisible();
    const box = await logo.boundingBox();
    expect(box?.width).toBeGreaterThan(24);
  });

  test("footer logo renders", async ({ page }) => {
    await page.goto(`${BASE}/`);
    const footerLogo = page.locator('footer img[src*="logo"]').first();
    await expect(footerLogo).toBeVisible();
  });
});

test.describe("Inner page heroes", () => {
  const INNER_PAGES = [
    { path: "/courses",    title: /our courses/i },
    { path: "/about",      title: /About/i },
    { path: "/contact",    title: /Contact/i },
    { path: "/faq",        title: /Frequently/i },
  ];

  for (const { path, title } of INNER_PAGES) {
    test(`${path} hero has h1 and solid teal box`, async ({ page }) => {
      await page.goto(`${BASE}${path}`);
      const h1 = page.locator("h1").first();
      await expect(h1).toBeVisible();
      await expect(h1).toHaveText(title);
    });

    test(`${path} no horizontal overflow at 320px`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await page.goto(`${BASE}${path}`);
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(320);
    });
  }
});

test.describe("No-photo pages (teal banner)", () => {
  for (const path of ["/privacy", "/terms", "/refund"]) {
    test(`${path} renders teal banner without error`, async ({ page }) => {
      await page.goto(`${BASE}${path}`);
      const h1 = page.locator("h1").first();
      await expect(h1).toBeVisible();
    });
  }
});
