import { test, expect } from "@playwright/test";

test.describe("Admin A1: Profile, Security and Identity", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("/dev/login");
    await page.getByRole("link", { name: "Rahiima Nakiyimba" }).click();
    await page.waitForURL("/admin");
  });

  test("A1.1: Initials display correctly (RN not R)", async ({ page }) => {
    // Check sidebar avatar shows RN for Rahiima Nakiyimba
    const avatar = page.locator(".portal-user .portal-avatar");
    await expect(avatar).toBeVisible();
    
    // Check if image loaded or initials fallback
    const img = avatar.locator("img");
    const hasImage = await img.count();
    
    if (hasImage === 0) {
      // No image, should show initials
      await expect(avatar).toContainText("RN");
    }
  });

  test("A1.2: Role label shows Admin (not ADMINISTRATION in caps)", async ({ page }) => {
    // Check role label in sidebar
    const roleLabel = page.locator(".portal-user-copy small");
    await expect(roleLabel).toBeVisible();
    await expect(roleLabel).toHaveText("Admin");
    
    // Verify it's fully visible (not cut off)
    const box = await roleLabel.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThan(10); // Should be visible, not clipped
    }
  });

  test("A1.3: Profile page exists and loads", async ({ page }) => {
    // Navigate to profile
    await page.goto("/admin/profile");
    await page.waitForLoadState("networkidle");
    
    // Check title
    await expect(page.getByRole("heading", { name: "Profile & Settings" })).toBeVisible();
    
    // Check avatar upload component exists
    await expect(page.locator(".portal-avatar, [aria-label*='profile photo' i]")).toBeVisible();
  });

  test("A1.4: Profile form has correct fields", async ({ page }) => {
    await page.goto("/admin/profile");
    
    // Locked fields (read-only)
    const nameInput = page.getByLabel(/full name/i);
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toBeDisabled();
    await expect(nameInput).toHaveValue(/Rahiima Nakiyimba/i);
    
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toBeDisabled();
    
    // Editable fields
    const titleInput = page.getByLabel(/title/i);
    await expect(titleInput).toBeVisible();
    await expect(titleInput).not.toBeDisabled();
    
    const phoneInput = page.getByLabel(/phone/i);
    await expect(phoneInput).toBeVisible();
    await expect(phoneInput).not.toBeDisabled();
  });

  test("A1.5: Theme preference section exists", async ({ page }) => {
    await page.goto("/admin/profile");
    
    // Check theme section
    await expect(page.getByRole("heading", { name: /theme/i })).toBeVisible();
    
    // Check theme buttons
    await expect(page.getByRole("button", { name: "light" })).toBeVisible();
    await expect(page.getByRole("button", { name: "dark" })).toBeVisible();
    await expect(page.getByRole("button", { name: "system" })).toBeVisible();
  });

  test("A1.6: Password change form exists", async ({ page }) => {
    await page.goto("/admin/profile");
    
    // Check password section
    await expect(page.getByRole("heading", { name: /change password/i })).toBeVisible();
    
    // Check password fields
    await expect(page.getByLabel(/current password/i)).toBeVisible();
    await expect(page.getByLabel(/new password/i)).toBeVisible();
    await expect(page.getByLabel(/confirm new password/i)).toBeVisible();
    
    // Check button
    await expect(page.getByRole("button", { name: /change password/i })).toBeVisible();
  });

  test("A1.7: 2FA section exists", async ({ page }) => {
    await page.goto("/admin/profile");
    
    // Check 2FA section
    await expect(page.getByRole("heading", { name: /two-factor/i })).toBeVisible();
    
    // Should show status (either active or not enabled)
    const twoFaSection = page.locator("#\\32 fa, [id='2fa']");
    await expect(twoFaSection).toBeVisible();
  });

  test("A1.8: Avatar persists after reload", async ({ page }) => {
    await page.goto("/admin/profile");
    
    // Check initial avatar state
    const avatar1 = page.locator(".portal-avatar").first();
    const hasImage1 = await avatar1.locator("img").count();
    const text1 = hasImage1 === 0 ? await avatar1.textContent() : null;
    
    // Reload
    await page.reload();
    await page.waitForLoadState("networkidle");
    
    // Check avatar state after reload
    const avatar2 = page.locator(".portal-avatar").first();
    const hasImage2 = await avatar2.locator("img").count();
    const text2 = hasImage2 === 0 ? await avatar2.textContent() : null;
    
    // Should be the same
    expect(hasImage1).toBe(hasImage2);
    if (text1 && text2) {
      expect(text1).toBe(text2);
    }
  });

  test("A1.9: Profile editable at 390px width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/profile");
    
    // Check form is visible and usable
    await expect(page.getByLabel(/phone/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /save changes/i })).toBeVisible();
  });

  test("A1.10: Profile editable at 1440px width", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/admin/profile");
    
    // Check form is visible and usable
    await expect(page.getByLabel(/phone/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /save changes/i })).toBeVisible();
  });

  test("A1.11: Notification preferences section exists", async ({ page }) => {
    await page.goto("/admin/profile");
    
    // Check notification preferences section
    await expect(page.getByRole("heading", { name: /notification preferences/i })).toBeVisible();
  });
});
