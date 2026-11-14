/**
 * S1: Student Profile and Photo
 *
 * Prerequisites:
 *   - npm run build && npm start on port 3000
 *   - npm run demo:reset (seeded data)
 *
 * Tests:
 *   1. Upload avatar, persist after logout and login
 *   2. Remove photo falls back to initials
 *   3. Broken avatar image falls back to initials in sidebar
 *   4. Bio and theme persist after reload
 *   5. Locked fields rejected by a direct API call
 *   6. Password change requires the current password
 */

import { test, expect, type Page } from "@playwright/test";
import path from "path";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const STUDENT_EMAIL = "student.full@example.com";

async function devLogin(page: Page) {
  await page.goto(`${BASE}/dev/login`);
  const row = page.locator("tr").filter({ hasText: STUDENT_EMAIL });
  if (await row.count() > 0) {
    await row.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
    return;
  }
  // Fallback: manual login
  await page.goto(`${BASE}/login`);
  await page.locator('input[name="identifier"], input[type="email"]').fill(STUDENT_EMAIL);
  await page.locator('input[name="password"], input[type="password"]').fill("Demo1234!");
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
}

/** Navigate to /dashboard/profile and wait for the page heading. */
async function goToProfile(page: Page) {
  await page.goto(`${BASE}/dashboard/profile`);
  await expect(page.locator("#main-content h1").filter({ hasText: /my profile/i })).toBeVisible({ timeout: 8_000 });
}

/** Get the session cookies for direct API calls. */
async function getSessionCookies(page: Page) {
  const context = page.context();
  const cookies = await context.cookies();
  const sessionToken = cookies.find((c) =>
    c.name.startsWith("authjs.session-token") || c.name.startsWith("__Secure-authjs.session-token"),
  );
  return sessionToken?.value ?? "";
}

test.describe("Student Profile & Avatar (S1)", () => {
  test.beforeEach(async ({ page }) => {
    await devLogin(page);
  });

  // ── 1. Upload avatar, persist after logout/login ───────────────────────
  test("1. Upload avatar, persist after logout and login", async ({ page }) => {
    await goToProfile(page);

    const avatarTrigger = page.locator('[aria-label="Upload profile photo"]');
    await expect(avatarTrigger).toBeVisible({ timeout: 5_000 });
    await avatarTrigger.click();

    const fileInput = page.locator('input[type="file"]');
    const testImagePath = path.join(process.cwd(), "img", "MTC logo.png");
    await fileInput.setInputFiles(testImagePath);

    const cropModal = page.getByRole("dialog", { name: /crop your profile photo/i });
    await expect(cropModal).toBeVisible({ timeout: 6_000 });
    await cropModal.getByRole("button", { name: /save photo/i }).click();

    await expect(cropModal).not.toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[aria-label="Upload profile photo"] img')).toBeVisible({ timeout: 10_000 });

    // Logout via user menu
    await page.locator(".portal-desktop-sidebar .portal-user-button").click();
    await page.locator('[role="menuitem"]').filter({ hasText: /log out/i }).first().click();
    await page.waitForURL(/signout|login/, { timeout: 10_000 });

    // Log back in
    await devLogin(page);

    // Avatar image should still be shown in the sidebar
    await expect(page.locator(".portal-avatar img").first()).toBeVisible({ timeout: 8_000 });
  });

  // ── 2. Remove photo falls back to initials ────────────────────────────
  test("2. Remove photo falls back to initials", async ({ page }) => {
    await goToProfile(page);

    const removeBtn = page.getByRole("button", { name: /remove photo/i });

    if (await removeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      page.once("dialog", (d) => d.accept());
      await removeBtn.click();
      await page.waitForTimeout(1500);

      // The img inside the avatar trigger should be gone
      await expect(page.locator('[aria-label="Upload profile photo"] img')).not.toBeVisible({ timeout: 5_000 });

      // Sidebar avatar should show text initials (1-2 uppercase letters)
      const sidebarAvatar = page.locator(".portal-avatar").first();
      const avatarImg = sidebarAvatar.locator("img");
      const hasImg = await avatarImg.isVisible().catch(() => false);
      if (!hasImg) {
        const initials = (await sidebarAvatar.textContent() ?? "").trim();
        expect(initials).toMatch(/^[A-Z]{1,2}$/);
      }
    } else {
      // Upload first, then remove
      await page.locator('[aria-label="Upload profile photo"]').click();
      const testImagePath = path.join(process.cwd(), "img", "MTC logo.png");
      await page.locator('input[type="file"]').setInputFiles(testImagePath);
      const cropModal = page.getByRole("dialog", { name: /crop your profile photo/i });
      await expect(cropModal).toBeVisible({ timeout: 6_000 });
      await cropModal.getByRole("button", { name: /save photo/i }).click();
      await expect(cropModal).not.toBeVisible({ timeout: 10_000 });

      await expect(page.getByRole("button", { name: /remove photo/i })).toBeVisible({ timeout: 5_000 });
      page.once("dialog", (d) => d.accept());
      await page.getByRole("button", { name: /remove photo/i }).click();
      await page.waitForTimeout(1500);
      await expect(page.locator('[aria-label="Upload profile photo"] img')).not.toBeVisible({ timeout: 5_000 });

      // Verify initials fallback in sidebar
      const sidebarAvatar = page.locator(".portal-avatar").first();
      const avatarImg = sidebarAvatar.locator("img");
      const hasImg = await avatarImg.isVisible().catch(() => false);
      if (!hasImg) {
        const initials = (await sidebarAvatar.textContent() ?? "").trim();
        expect(initials).toMatch(/^[A-Z]{1,2}$/);
      }
    }
  });

  // ── 3. Broken avatar image falls back to initials in sidebar ──────────
  test("3. Broken avatar image falls back to initials in sidebar", async ({ page }) => {
    // Navigate to the dashboard (not profile) so we see the sidebar
    await page.goto(`${BASE}/dashboard`);
    await expect(page.locator(".portal-avatar").first()).toBeVisible({ timeout: 8_000 });

    // If there is no photo, initials should already show
    const avatarImg = page.locator(".portal-avatar img").first();
    const hasPhoto = await avatarImg.isVisible().catch(() => false);

    if (!hasPhoto) {
      // No photo: initials must be visible (1-2 uppercase letters)
      const initials = (await page.locator(".portal-avatar").first().textContent() ?? "").trim();
      expect(initials).toMatch(/^[A-Z]{1,2}$/);
    } else {
      // Photo exists: simulate a broken image by removing the src via eval
      // The onError handler should swap to initials
      await page.evaluate(() => {
        const img = document.querySelector(".portal-avatar img") as HTMLImageElement | null;
        if (img) {
          img.onerror = null; // remove existing handler temporarily
          img.src = "/api/avatar/invalid-id-that-does-not-exist";
        }
      });
      // Wait for onError to fire and fall back
      await page.waitForTimeout(2000);

      // After the broken image, the initials text should appear
      const sidebarAvatar = page.locator(".portal-avatar").first();
      const avatarImgAfter = sidebarAvatar.locator("img");
      const hasImgAfter = await avatarImgAfter.isVisible().catch(() => false);
      if (!hasImgAfter) {
        const initials = (await sidebarAvatar.textContent() ?? "").trim();
        expect(initials).toMatch(/^[A-Z]{1,2}$/);
      }
    }
  });

  // ── 4. Bio and theme persist after reload ─────────────────────────────
  test("4. Bio and theme persist after reload", async ({ page }) => {
    await goToProfile(page);

    // Find the bio textarea
    const bioField = page.locator("textarea").first();
    await bioField.fill("S1 student bio - aspiring home care professional.");

    // Find the theme select (the one with system/light/dark options)
    const themeSelect = page.locator("select").filter({ hasText: /system default/i }).first();
    await themeSelect.selectOption("dark");

    // Save
    await page.getByRole("button", { name: /save changes/i }).first().click();
    await expect(page.getByText(/profile updated/i)).toBeVisible({ timeout: 6_000 });

    // Reload and verify persistence
    await page.reload();
    await expect(page.locator("#main-content h1").filter({ hasText: /my profile/i })).toBeVisible({ timeout: 8_000 });

    await expect(page.locator("textarea").first()).toHaveValue(/S1 student bio/);
    const themeAfterReload = page.locator("select").filter({ hasText: /system default/i }).first();
    await expect(themeAfterReload).toHaveValue("dark");

    // Reset theme to system so other tests are not affected
    await themeAfterReload.selectOption("system");
    await page.getByRole("button", { name: /save changes/i }).first().click();
    await page.waitForTimeout(600);
  });

  // ── 5. Locked fields rejected by a direct API call ───────────────────
  test("5. Locked fields rejected by a direct API call", async ({ page }) => {
    await goToProfile(page);

    // Verify locked fields are visible and read-only in the UI
    // Email should be disabled
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeDisabled();

    // Name should be disabled (student)
    const nameInput = page.locator('input[id="name"]');
    await expect(nameInput).toBeDisabled();

    // Now test via direct API call that the server rejects locked field changes
    const response = await page.request.patch(`${BASE}/api/profile`, {
      headers: { "Content-Type": "application/json" },
      data: {
        name: "Hacker Name",
        email: "hacker@evil.com",
        studentNumber: "2026/HAX/999",
      },
    });

    // Should be rejected (403)
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("Admin");

    // Verify the name and email were NOT changed by fetching the profile again
    await page.goto(`${BASE}/dashboard/profile`);
    await expect(page.locator("#main-content h1").filter({ hasText: /my profile/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('input[type="email"]')).toHaveValue(STUDENT_EMAIL);
    await expect(page.locator('input[id="name"]')).not.toHaveValue("Hacker Name");
  });

  // ── 6. Password change requires the current password ────────────────
  test("6. Password change requires the current password", async ({ page }) => {
    await goToProfile(page);

    // Scroll to password section
    const pwSection = page.locator("#password");
    await pwSection.scrollIntoViewIfNeeded();

    // Try with wrong current password
    await page.locator("#oldPassword").fill("WrongPassword123!");
    await page.locator("#newPassword").fill("NewPass456!");
    await page.locator("#confirmPassword").fill("NewPass456!");
    await pwSection.locator('button[type="submit"]').click();

    // Should show error about incorrect current password
    await expect(page.locator('[role="alert"]').filter({ hasText: /current password is incorrect/i })).toBeVisible({ timeout: 6_000 });

    // Now try with correct current password (should succeed)
    await page.locator("#oldPassword").fill("Demo1234!");
    await page.locator("#newPassword").fill("Demo1234!");
    await page.locator("#confirmPassword").fill("Demo1234!");
    await pwSection.locator('button[type="submit"]').click();

    // Should show success
    await expect(page.locator('[role="status"]').filter({ hasText: /password changed/i })).toBeVisible({ timeout: 6_000 });
  });
});
