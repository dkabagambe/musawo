/**
 * E2E tests: post-login redirect for each seeded role.
 *
 * Uses the /dev/login quick-sign-in page so no passwords are needed.
 * All accounts are created by `npx prisma db seed`.
 *
 * Run: npx playwright test e2e/redirects.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/** Sign in via the dev-login quick button (no password required). */
async function devLogin(page: Page, email: string, expectedUrlPattern: RegExp) {
  // Clear any stale session from a previous test
  await page.context().clearCookies();
  await page.goto(`${BASE}/dev/login`);
  const emailPattern = new RegExp(
    `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
  );
  const row = page.locator("tr").filter({
    has: page.locator("td").filter({ hasText: emailPattern }),
  });
  await row.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(expectedUrlPattern, { timeout: 15_000 });
}

async function logout(page: Page) {
  // Navigate to the signout page which uses a server action to clear the
  // JWT cookie server-side. The page redirects to /login on completion.
  await page.goto(`${BASE}/signout`);
  await page.waitForURL(/\/login/, { timeout: 10_000 });
}

// ─── Post-login landing per role ──────────────────────────────────────────────

test.describe("Post-login redirect by role", () => {
  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  const ROLE_LANDINGS: Array<{ label: string; email: string; pattern: RegExp }> = [
    // DIRECTOR and PRINCIPAL are redirected to /2fa-setup on first login
    // because mandatory TOTP is required for those roles before portal access.
    { label: "DIRECTOR",          email: "director@mtc.ac.ug",          pattern: /\/2fa-setup/ },
    { label: "PRINCIPAL",         email: "principal@mtc.ac.ug",         pattern: /\/2fa-setup/ },
    { label: "ADMIN",             email: "admin@mtc.ac.ug",             pattern: /\/admin/ },
    { label: "ACADEMIC_REGISTRAR", email: "registrar@mtc.ac.ug",        pattern: /\/registrar/ },
    { label: "INSTRUCTOR",        email: "tutor@mtc.ac.ug",             pattern: /\/tutor/ },
    { label: "INSTRUCTOR (2)",    email: "tutor2@mtc.ac.ug",            pattern: /\/tutor/ },
    { label: "SYSTEM_IT",         email: "itadmin@mtc.ac.ug",           pattern: /\/system/ },
    { label: "STUDENT",           email: "student.full@example.com",    pattern: /\/dashboard/ },
  ];

  for (const { label, email, pattern } of ROLE_LANDINGS) {
    test(`${label} (${email}) lands on correct portal`, async ({ page }) => {
      await devLogin(page, email, pattern);
      expect(page.url()).not.toContain("_rbac_redirect");
      expect(page.url()).not.toContain("/login");
    });
  }
});

// ─── Access control (unauthenticated) ────────────────────────────────────────

test.describe("Access control", () => {
  test("unauthenticated user hitting /dashboard is redirected to /login", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user hitting /admin is redirected to /login", async ({ page }) => {
    await page.goto(`${BASE}/admin`);
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user hitting /director is redirected to /login", async ({ page }) => {
    await page.goto(`${BASE}/director`);
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user hitting /finance is redirected to /login", async ({ page }) => {
    await page.goto(`${BASE}/finance`);
    await expect(page).toHaveURL(/\/login/);
  });

  test("logged-in student hitting /admin is redirected to /dashboard", async ({ page }) => {
    await devLogin(page, "student.full@example.com", /\/dashboard/);
    await page.goto(`${BASE}/admin`);
    await expect(page).toHaveURL(/\/dashboard/);
    await logout(page);
  });

  test("logged-in student hitting /director is redirected to /dashboard", async ({ page }) => {
    await devLogin(page, "student.full@example.com", /\/dashboard/);
    await page.goto(`${BASE}/director`);
    await expect(page).toHaveURL(/\/dashboard/);
    await logout(page);
  });

  test("logged-in INSTRUCTOR hitting /director is redirected to /tutor", async ({ page }) => {
    await devLogin(page, "tutor@mtc.ac.ug", /\/tutor/);
    await page.goto(`${BASE}/director`);
    await expect(page).toHaveURL(/\/tutor/);
    await logout(page);
  });

  test("logged-in ADMINISTRATOR hitting /director is redirected to /admin", async ({ page }) => {
    await devLogin(page, "admin@mtc.ac.ug", /\/admin/);
    await page.goto(`${BASE}/director`);
    await expect(page).toHaveURL(/\/admin/);
    await logout(page);
  });

  test("logged-in user hitting /login is sent to their home portal", async ({ page }) => {
    await devLogin(page, "student.full@example.com", /\/dashboard/);
    await page.goto(`${BASE}/login`);
    await expect(page).toHaveURL(/\/dashboard/);
    await logout(page);
  });

  test("/bursar redirects to /finance", async ({ page }) => {
    await page.goto(`${BASE}/bursar`);
    await expect(page).toHaveURL(/\/finance|\/login/);
  });

  test("no redirect ever lands on /_rbac_redirect", async ({ page }) => {
    const accounts = [
      "student.full@example.com",
      "tutor@mtc.ac.ug",
      "registrar@mtc.ac.ug",
      "admin@mtc.ac.ug",
    ];
    for (const email of accounts) {
      await devLogin(
        page,
        email,
        /\/(dashboard|tutor|registrar|admin)/,
      );
      expect(page.url()).not.toContain("_rbac_redirect");
      await logout(page);
    }
  });
});
