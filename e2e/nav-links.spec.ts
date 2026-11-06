/**
 * Navigation and footer link check.
 * Verifies that no menu or footer link points to "#" or returns 404/500.
 *
 * Run: npx playwright test e2e/nav-links.spec.ts
 */

import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/** All links expected to be reachable from the nav or footer */
const INTERNAL_HREFS = Array.from(
  new Set([
    "/",
    "/about",
    "/admissions/how-to-enrol",
    "/impact",
    "/courses",
    "/courses/medical-home-caregiver",
    "/courses/basic-home-caregiver",
    "/courses/babysitting-childcare-safety",
    "/courses/mental-health-support-advocacy",
    "/courses/care-older-persons-disability",
    "/courses/basic-life-support-first-aid",
    "/courses/advanced-life-support",
    "/courses/advanced-first-aid",
    "/admissions/fees",
    "/admissions/payment-options",
    "/learning/how-you-learn",
    "/learning/live-classes",
    "/faq",
    "/contact",
    "/login",
    "/privacy",
    "/terms",
    "/refund",
  ])
);

test.describe("No dead internal links in nav or footer", () => {
  for (const href of INTERNAL_HREFS) {
    test(`${href} returns 200`, async ({ request }) => {
      const res = await request.get(`${BASE}${href}`, { maxRedirects: 5 });
      expect(res.status(), `${href} returned ${res.status()}`).toBeLessThan(400);
    });
  }
});

test.describe("No '#' href links on the homepage", () => {
  test("all <a> tags on / have non-empty href that is not '#'", async ({ page }) => {
    await page.goto(`${BASE}/`);
    const hrefs = await page.$$eval("a[href]", (els) =>
      els.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? "")
    );
    const dead = hrefs.filter((h) => h === "#" || h === "");
    expect(dead, `Found dead hrefs: ${dead.join(", ")}`).toHaveLength(0);
  });
});

test.describe("Header navigation — 4-tab flat nav", () => {
  test("desktop nav renders exactly the 4 current top-level items", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/`);
    const nav = page.locator("nav[aria-label='Main navigation']");
    await expect(nav).toBeVisible();
    for (const label of ["Home", "About MTC", "How to Enrol", "Impact"]) {
      await expect(nav.locator(`text=${label}`).first()).toBeVisible();
    }
    // Old nav items must NOT appear
    for (const label of ["Courses", "Admissions", "Learning", "Contact"]) {
      await expect(nav.locator(`role=link[name="${label}"]`)).toHaveCount(0);
    }
    // No dropdown menus
    await expect(page.locator("[role='menu']")).toHaveCount(0);
  });

  test("Log in and Apply now buttons are present in desktop header", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/`);
    const header = page.locator("header");
    await expect(header.locator("text=Log in").first()).toBeVisible();
    await expect(header.locator("text=Apply now").first()).toBeVisible();
  });

  test("mobile drawer opens and shows the 4 nav items", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/`);
    const hamburger = page.locator("button[aria-controls='mobile-drawer']");
    await hamburger.click();
    const drawer = page.locator("#mobile-drawer");
    await expect(drawer).toBeVisible();
    for (const label of ["Home", "About MTC", "How to Enrol", "Impact"]) {
      await expect(drawer.locator(`text=${label}`).first()).toBeVisible();
    }
  });
});

test.describe("Footer appears on public pages", () => {
  for (const path of ["/", "/courses", "/about", "/contact"]) {
    test(`footer visible on ${path}`, async ({ page }) => {
      await page.goto(`${BASE}${path}`);
      // Use data-testid to target the site footer, not any inline <footer> element
      const footer = page.locator('[data-testid="site-footer"]');
      await footer.scrollIntoViewIfNeeded();
      await expect(footer).toBeVisible();
      await expect(footer).toContainText("MUSAWO");
    });
  }
});
