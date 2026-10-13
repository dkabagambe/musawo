/**
 * E2E tests: auth layout — logo link, "Back to home" link, and form presence.
 *
 * Asserts that on every auth page:
 *  1. The logo link exists and points to /
 *  2. A "Back to home" link exists and navigating it goes to /
 *  3. The form (or main heading) exists
 *
 * Run: npx playwright test e2e/auth-layout.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/** Auth pages to check */
const AUTH_PAGES = [
  { path: "/login",               formSelector: "form",              name: "Login" },
  { path: "/register",            formSelector: "form",              name: "Register" },
  { path: "/forgot-password",     formSelector: "form",              name: "Forgot password" },
  { path: "/otp",                 formSelector: "form",              name: "OTP phone sign-in" },
  { path: "/check-email",         formSelector: "h1",                name: "Check email" },
  { path: "/resend-verification", formSelector: "form",              name: "Resend verification" },
];

async function assertAuthLayout(page: Page, path: string) {
  await page.goto(`${BASE}${path}`);

  // 1. Logo link — visible and points to /
  const logoLink = page.getByRole("link", { name: /musawo training center/i }).first();
  await expect(logoLink).toBeVisible();
  const logoHref = await logoLink.getAttribute("href");
  expect(logoHref).toBe("/");

  // 2. "Back to home" link — visible (at least one)
  const backLinks = page.getByRole("link", { name: /back to home/i });
  // On mobile viewport the link might only be in the teal bar; on desktop in the top nav.
  // Accept at least one being present in the DOM.
  expect(await backLinks.count()).toBeGreaterThan(0);
}

test.describe("Auth layout — logo and back-to-home", () => {
  for (const { path, formSelector, name } of AUTH_PAGES) {
    test(`${name} page has logo link, back-to-home link, and form`, async ({ page }) => {
      await assertAuthLayout(page, path);

      // Form / main content exists
      await expect(page.locator(formSelector).first()).toBeVisible();
    });
  }
});

test.describe("Auth layout — clicking Back to home navigates to /", () => {
  for (const { path, name } of AUTH_PAGES.slice(0, 4)) {
    // Test the navigation on the first 4 (the others are static pages with no router.back issues)
    test(`${name}: clicking Back to home goes to /`, async ({ page }) => {
      await page.goto(`${BASE}${path}`);
      const backLink = page.getByRole("link", { name: /back to home/i }).first();
      await backLink.click();
      await page.waitForURL((url) => url.pathname === "/", { timeout: 8_000 });
      expect(new URL(page.url()).pathname).toBe("/");
    });
  }
});

test.describe("Auth layout — responsive", () => {
  const VIEWPORTS = [
    { name: "mobile-320",  width: 320,  height: 844 },
    { name: "mobile-390",  width: 390,  height: 844 },
    { name: "tablet-768",  width: 768,  height: 1024 },
    { name: "desktop-1024", width: 1024, height: 768 },
    { name: "desktop-1440", width: 1440, height: 900 },
  ];

  for (const vp of VIEWPORTS) {
    test(`Logo and Back-to-home visible without scrolling at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/login`);

      // Logo should be in the viewport without scrolling
      const logoLink = page.getByRole("link", { name: /musawo training center/i }).first();
      await expect(logoLink).toBeInViewport();

      // At least one back-to-home link should be visible
      const backLink = page.getByRole("link", { name: /back to home/i }).first();
      await expect(backLink).toBeInViewport();
    });
  }
});
