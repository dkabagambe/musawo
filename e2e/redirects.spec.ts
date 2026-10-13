/**
 * E2E tests: post-login redirect for each seeded role.
 *
 * Prerequisites:
 *   - Dev server running on http://localhost:3000
 *   - Database seeded with `npx prisma db seed`
 *
 * Run: npx playwright test e2e/redirects.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  // Wait for navigation away from /login
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 10_000 });
}

async function logout(page: Page) {
  await page.goto(`${BASE}/api/auth/signout`);
  // Accept the sign-out form if presented
  const btn = page.getByRole("button", { name: /sign out/i });
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.click();
  }
  await page.waitForURL((url) => url.pathname === "/" || url.pathname.startsWith("/login"), {
    timeout: 8_000,
  });
}

test.describe("Post-login redirect by role", () => {
  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test("STUDENT lands on /dashboard", async ({ page }) => {
    await login(page, "student@example.com", "Student1234!");
    expect(page.url()).toContain("/dashboard");
    expect(page.url()).not.toContain("_rbac_redirect");
  });

  test("TUTOR lands on /tutor", async ({ page }) => {
    await login(page, "tutor@musawotraining.ug", "Tutor1234!");
    expect(page.url()).toContain("/tutor");
  });

  test("REGISTRAR lands on /admin/students", async ({ page }) => {
    await login(page, "registrar@musawotraining.ug", "Registrar1234!");
    expect(page.url()).toContain("/admin/students");
  });

  test("BURSAR lands on /bursar", async ({ page }) => {
    await login(page, "bursar@musawotraining.ug", "Bursar1234!");
    expect(page.url()).toContain("/bursar");
  });

  test("SYSTEM_IT lands on /system", async ({ page }) => {
    await login(page, "system@musawotraining.ug", "SystemIT1234!");
    expect(page.url()).toContain("/system");
  });

  test("SUPERADMIN lands on /director (TOTP disabled in dev seed)", async ({ page }) => {
    await login(page, "superadmin@musawotraining.ug", "SuperAdmin1234!");
    expect(page.url()).toContain("/director");
  });

  test("freshly registered student lands on /dashboard after login", async ({ page }) => {
    const email = `e2e_${Date.now()}@test.ug`;
    const password = "Test1234!";

    // Register
    await page.goto(`${BASE}/register`);
    await page.getByLabel("Full name").fill("E2E Test User");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel(/^Password$/).fill(password);
    await page.getByLabel(/confirm password/i).fill(password);
    await page.getByLabel(/I consent/i).check();
    await page.getByRole("button", { name: /create account/i }).click();
    // Should redirect to /login
    await page.waitForURL((url) => url.pathname.startsWith("/login"), { timeout: 10_000 });

    // Login with new account
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 10_000 });

    expect(page.url()).toContain("/dashboard");
    expect(page.url()).not.toContain("_rbac_redirect");
  });
});

test.describe("Access control", () => {
  test("unauthenticated user hitting /dashboard is redirected to /login", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user hitting /admin is redirected to /login", async ({ page }) => {
    await page.goto(`${BASE}/admin`);
    await expect(page).toHaveURL(/\/login/);
  });

  test("logged-in student hitting /admin is redirected to /dashboard", async ({ page }) => {
    await login(page, "student@example.com", "Student1234!");
    await page.goto(`${BASE}/admin`);
    await expect(page).toHaveURL(/\/dashboard/);
    await logout(page);
  });

  test("logged-in bursar cannot open /admin/students (redirected to /bursar)", async ({ page }) => {
    await login(page, "bursar@musawotraining.ug", "Bursar1234!");
    await page.goto(`${BASE}/admin/students`);
    await expect(page).toHaveURL(/\/bursar/);
    await logout(page);
  });

  test("logged-in user hitting /login is sent to their home", async ({ page }) => {
    await login(page, "student@example.com", "Student1234!");
    await page.goto(`${BASE}/login`);
    await expect(page).toHaveURL(/\/dashboard/);
    await logout(page);
  });

  test("callbackUrl is honoured after login", async ({ page }) => {
    await page.goto(`${BASE}/login?callbackUrl=%2Fdashboard%2Fcourses`);
    await page.getByLabel("Email address").fill("student@example.com");
    await page.getByLabel("Password").fill("Student1234!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 10_000 });
    expect(page.url()).toContain("/dashboard/courses");
    await logout(page);
  });

  test("no redirect ever lands on /_rbac_redirect", async ({ page }) => {
    // Login as each role and check
    const users = [
      ["student@example.com", "Student1234!"],
      ["tutor@musawotraining.ug", "Tutor1234!"],
      ["registrar@musawotraining.ug", "Registrar1234!"],
      ["bursar@musawotraining.ug", "Bursar1234!"],
    ];
    for (const [email, password] of users) {
      await login(page, email, password);
      expect(page.url()).not.toContain("_rbac_redirect");
      await logout(page);
    }
  });
});
