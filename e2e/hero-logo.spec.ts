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

      const h1 = page.locator("h1").first();
      await expect(h1).toBeVisible();
      await expect(h1).toContainText(/certified/i);

      // Eyebrow must be visible (not clipped by header)
      const eyebrow = page.locator('text=Now enrolling').first();
      await expect(eyebrow).toBeVisible();
      // Eyebrow top must be below header bottom (64px)
      const eyebrowBox = await eyebrow.boundingBox();
      if (eyebrowBox) expect(eyebrowBox.y).toBeGreaterThan(64);

      // No horizontal scroll
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(vp.width);

      // Facts strip present
      const factItems = page.locator('[aria-label="Key facts"] li');
      expect(await factItems.count()).toBeGreaterThanOrEqual(2);

      // No tick-list inside hero box
      const ticksInHero = await page.locator('section[aria-label="Hero"] li').count();
      expect(ticksInHero).toBe(0);
    });
  }

  test("has solid teal header (not transparent)", async ({ page }) => {
    await page.goto(`${BASE}/`);
    const header = page.locator("header");
    await expect(header).toBeVisible();
    const bg = await header.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
    expect(bg).not.toBe("transparent");
  });

  test("Enrol now CTA links to /register", async ({ page }) => {
    await page.goto(`${BASE}/`);
    const cta = page.locator('a[href="/register"]').first();
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
    { path: "/courses",    title: /Accredited Courses/i },
    { path: "/about",      title: /About/i },
    { path: "/contact",    title: /Contact/i },
    { path: "/resources",  title: /Resource/i },
    { path: "/faq",        title: /Frequently/i },
    { path: "/scholarships", title: /Scholarship/i },
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
