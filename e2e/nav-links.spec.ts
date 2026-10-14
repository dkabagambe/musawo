/**
 * Navigation and footer link check.
 * Verifies that no menu or footer link points to "#" or returns 404/500.
 *
 * Run: npx playwright test e2e/nav-links.spec.ts
 */

import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/** All links expected in the nav dropdowns */
const NAV_HREFS = [
  "/",
  "/courses/cna",
  "/courses/basic-nursing-care",
  "/courses/child-care-safety",
  "/courses",
  "/admissions/how-to-enrol",
  "/admissions/fees",
  "/scholarships",
  "/admissions/payment-options",
  "/learning/how-you-learn",
  "/learning/live-classes",
  "/learning/exams",
  "/resources",
  "/about",
  "/about/accreditation",
  "/about/trainers",
  "/faq",
  "/contact",
  "/login",
  "/register",
];

/** All links expected in the footer */
const FOOTER_HREFS = [
  "/",
  "/courses",
  "/admissions/how-to-enrol",
  "/learning/how-you-learn",
  "/about",
  "/resources",
  "/scholarships",
  "/faq",
  "/contact",
  "/login",
  "/courses/cna",
  "/courses/basic-nursing-care",
  "/courses/child-care-safety",
  "/contact",
  "/privacy",
  "/terms",
  "/refund",
];

/** Deduplicate and combine */
const ALL_INTERNAL_HREFS = Array.from(new Set([...NAV_HREFS, ...FOOTER_HREFS]));

test.describe("No dead internal links in nav or footer", () => {
  for (const href of ALL_INTERNAL_HREFS) {
    test(`${href} returns 200`, async ({ request }) => {
      const res = await request.get(`${BASE}${href}`, {
        // Follow redirects (Next.js may redirect /courses to /courses/ etc.)
        maxRedirects: 5,
      });
      expect(
        res.status(),
        `${href} returned ${res.status()}`,
      ).toBeLessThan(400);
    });
  }
});

test.describe("No '#' href links on the homepage", () => {
  test("all <a> tags on / have non-empty href that is not '#'", async ({ page }) => {
    await page.goto(`${BASE}/`);
    const hrefs = await page.$$eval(
      "a[href]",
      (els) => els.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""),
    );
    const dead = hrefs.filter((h) => h === "#" || h === "");
    expect(dead, `Found dead hrefs: ${dead.join(", ")}`).toHaveLength(0);
  });
});

test.describe("Header navigation links exist on homepage", () => {
  test("desktop nav renders all top-level items", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/`);
    const nav = page.locator("nav[aria-label='Main navigation']");
    await expect(nav).toBeVisible();
    for (const label of ["Home", "Courses", "Admissions", "Learning", "About", "Contact"]) {
      await expect(nav.locator(`text=${label}`).first()).toBeVisible();
    }
  });

  test("mobile drawer opens and shows nav items", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/`);
    const hamburger = page.locator("button[aria-controls='mobile-drawer']");
    await hamburger.click();
    const drawer = page.locator("#mobile-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer.locator("text=Courses")).toBeVisible();
    await expect(drawer.locator("text=Admissions")).toBeVisible();
  });
});

test.describe("Footer appears on public pages", () => {
  for (const path of ["/", "/courses", "/about", "/contact"]) {
    test(`footer visible on ${path}`, async ({ page }) => {
      await page.goto(`${BASE}${path}`);
      const footer = page.locator("footer");
      await expect(footer).toBeVisible();
      // Check the copyright text
      await expect(footer).toContainText("MUSAWO");
      // Check at least one enquiries section
      await expect(footer.locator("text=Local Enquiries")).toBeVisible();
    });
  }
});
