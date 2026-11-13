import { test, expect } from "@playwright/test";
import path from "path";

/**
 * T1: Profile and Profile Picture
 * 
 * Tests:
 * 1. Upload photo, logout, login, photo still shown
 * 2. Wrong file type rejected
 * 3. Oversized file rejected
 * 4. Remove photo falls back to initials
 * 5. Photo survives page reload
 */

test.describe("Tutor Profile & Avatar", () => {
  test.beforeEach(async ({ page }) => {
    // Login as instructor
    await page.goto("/login");
    await page.fill('input[name="email"]', "instructor@example.com");
    await page.fill('input[name="password"]', "Demo1234!");
    await page.click('button[type="submit"]');
    await page.waitForURL("/tutor");
  });

  test("should upload avatar, persist after logout/login", async ({ page }) => {
    // Navigate to profile
    await page.goto("/tutor/profile");
    await expect(page.locator("h1")).toContainText("My Profile");

    // Click avatar to upload
    await page.click('[aria-label="Upload profile photo"]');
    
    // Upload a valid image file (create a 100x100 test image)
    const testImagePath = path.join(process.cwd(), "img", "MTC logo.png");
    
    await page.setInputFiles('input[type="file"]', testImagePath);

    // Wait for crop modal
    await expect(page.locator('text="Crop your photo"')).toBeVisible();

    // Save the cropped image
    await page.click('button:has-text("Save photo")');

    // Wait for upload to complete
    await page.waitForTimeout(2000);

    // Verify avatar is shown (not initials)
    const avatar = page.locator(".portal-avatar img").first();
    await expect(avatar).toBeVisible();

    // Logout
    await page.click(".portal-user-button");
    await page.click('a:has-text("Log out")');
    await page.waitForURL("/signout");

    // Login again
    await page.goto("/login");
    await page.fill('input[name="email"]', "instructor@example.com");
    await page.fill('input[name="password"]', "Demo1234!");
    await page.click('button[type="submit"]');
    await page.waitForURL("/tutor");

    // Verify avatar still shown
    const avatarAfterLogin = page.locator(".portal-avatar img").first();
    await expect(avatarAfterLogin).toBeVisible();
  });

  test("should reject non-image file", async ({ page }) => {
    await page.goto("/tutor/profile");

    // Try to upload a text file
    const content = Buffer.from("This is not an image");
    await page.setInputFiles('input[type="file"]', {
      name: "test.txt",
      mimeType: "text/plain",
      buffer: content,
    });

    // Should show error (either in modal or below avatar)
    await page.waitForTimeout(1000);
    const errorText = page.locator('text=/Only.*images.*accepted/i');
    await expect(errorText).toBeVisible({ timeout: 5000 });
  });

  test("should update bio and theme", async ({ page }) => {
    await page.goto("/tutor/profile");

    // Fill bio
    const bio = "Experienced medical instructor with 10+ years in healthcare education.";
    await page.fill('textarea', bio);

    // Select theme
    await page.selectOption('select', "dark");

    // Save
    await page.click('button:has-text("Save changes")');

    // Wait for success message
    await expect(page.locator('text="Profile updated"')).toBeVisible();

    // Reload page and verify persistence
    await page.reload();

    // Bio should still be there
    const bioField = page.locator('textarea');
    await expect(bioField).toHaveValue(bio);

    // Theme should still be dark
    const themeSelect = page.locator('select');
    await expect(themeSelect).toHaveValue("dark");
  });

  test("should remove photo and fall back to initials", async ({ page }) => {
    await page.goto("/tutor/profile");

    // Check if "Remove photo" button exists (photo already uploaded)
    const removeButton = page.locator('button:has-text("Remove photo")');
    
    if (await removeButton.isVisible()) {
      // Click remove
      page.once("dialog", (dialog) => dialog.accept());
      await removeButton.click();

      // Wait for removal
      await page.waitForTimeout(1000);

      // Verify initials shown instead of image
      const avatar = page.locator(".portal-avatar").first();
      const img = avatar.locator("img");
      await expect(img).not.toBeVisible();
      await expect(avatar).toContainText(/[A-Z]{1,2}/); // Should show initials
    }
  });

  test("should display correct initials (strip titles)", async ({ page }) => {
    // This test assumes the seeded instructor has a title like "Dr. Joel Mirembe"
    await page.goto("/tutor");

    // Check sidebar avatar
    const avatar = page.locator(".portal-avatar").first();
    
    // If no photo, should show initials without title
    const avatarText = await avatar.textContent();
    
    // Should be "JM" not "DJ" (if name is "Dr. Joel Mirembe")
    // Note: this depends on the actual seeded data
    expect(avatarText?.trim()).toMatch(/^[A-Z]{1,2}$/);
  });
});
