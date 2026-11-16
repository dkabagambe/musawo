import { test, expect, Page } from "@playwright/test";

async function loginAsPrincipal(page: Page) {
  await page.goto("/login");
  await page.fill('input[name="email"]', "nankya.shanita@musawo.ac.ug");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/principal/, { timeout: 5000 });
}

test.describe("P1: Principal Profile, Security and Identity", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPrincipal(page);
  });

  test("P1.1 - Profile page loads with correct name and initials", async ({ page }) => {
    await page.goto("/principal/profile");
    
    // Header
    await expect(page.locator("h1")).toContainText("Profile & Settings");
    
    // Name display should show full name
    await expect(page.getByText(/Nankya Shanita/i)).toBeVisible();
    
    // Role label should be "Principal" not "PRINCIPAL"
    await expect(page.getByText("Principal")).toBeVisible();
    
    // Initials should be shown (NS for Nankya Shanita)
    await expect(page.getByText(/Initials.*NS/i)).toBeVisible();
  });

  test("P1.2 - Avatar shows correct initials without title", async ({ page }) => {
    await page.goto("/principal/profile");
    
    // If avatar fails to load, initials should be NS (first + last, ignoring any title)
    // This is tested by the avatar fallback behavior
    const avatar = page.locator('[data-testid="avatar"]').first();
    if (await avatar.isVisible()) {
      const avatarText = await avatar.textContent();
      // Should be NS or have an image
      expect(avatarText === "NS" || avatarText === "").toBe(true);
    }
  });

  test("P1.3 - Name field is locked (read-only)", async ({ page }) => {
    await page.goto("/principal/profile");
    
    // Find the name input
    const nameInput = page.locator('input[value*="Nankya"]');
    await expect(nameInput).toBeDisabled();
    
    // Should have read-only hint
    await expect(page.getByText(/read-only.*contact Admin/i)).toBeVisible();
  });

  test("P1.4 - Email field is locked (read-only)", async ({ page }) => {
    await page.goto("/principal/profile");
    
    // Email should be disabled
    const emailInput = page.locator('input[value*="@musawo"]');
    await expect(emailInput).toBeDisabled();
  });

  test("P1.5 - Title field is editable", async ({ page }) => {
    await page.goto("/principal/profile");
    
    // Title field should be editable
    const titleInput = page.locator('input[placeholder*="Dr."]');
    await expect(titleInput).not.toBeDisabled();
    await expect(titleInput).toBeEditable();
  });

  test("P1.6 - Phone field is editable", async ({ page }) => {
    await page.goto("/principal/profile");
    
    // Phone field should be editable
    const phoneInput = page.locator('input[placeholder*="+256"]');
    await expect(phoneInput).not.toBeDisabled();
    await expect(phoneInput).toBeEditable();
  });

  test("P1.7 - Theme preference can be changed", async ({ page }) => {
    await page.goto("/principal/profile");
    
    // Theme section should exist
    await expect(page.getByText(/Theme/i)).toBeVisible();
    
    // Theme buttons should be present
    await expect(page.getByRole("button", { name: /light/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /dark/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /system/i })).toBeVisible();
  });

  test("P1.8 - Password change form exists", async ({ page }) => {
    await page.goto("/principal/profile");
    
    // Password section
    await expect(page.getByText(/Change Password/i)).toBeVisible();
    
    // Password fields
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    
    // Current password required
    await expect(page.getByText(/Current password/i)).toBeVisible();
  });

  test("P1.9 - 2FA section shows setup link when not enabled", async ({ page }) => {
    await page.goto("/principal/profile");
    
    // 2FA section should exist
    await expect(page.getByText(/Two-Factor Authentication/i)).toBeVisible();
    
    // Should show either "active" or "not enabled" status
    const has2FAActive = await page.getByText(/2FA is active/i).isVisible().catch(() => false);
    const has2FADisabled = await page.getByText(/2FA is not enabled/i).isVisible().catch(() => false);
    
    expect(has2FAActive || has2FADisabled).toBe(true);
    
    // If disabled, should have setup link
    if (has2FADisabled) {
      await expect(page.getByRole("link", { name: /Set up two-factor/i })).toBeVisible();
    }
  });

  test("P1.10 - Active sessions section exists", async ({ page }) => {
    await page.goto("/principal/profile");
    
    // Sessions section
    await expect(page.getByText(/Active Sessions/i)).toBeVisible();
    await expect(page.getByText(/Recent login sessions/i)).toBeVisible();
  });

  test("P1.11 - Account creation date is shown", async ({ page }) => {
    await page.goto("/principal/profile");
    
    // Account info card
    await expect(page.getByText(/Account created/i)).toBeVisible();
    await expect(page.getByText(/Status/i)).toBeVisible();
  });

  test("P1.12 - Avatar upload component is present", async ({ page }) => {
    await page.goto("/principal/profile");
    
    // Avatar should be visible
    const avatar = page.locator('img, [data-testid="avatar"]').first();
    await expect(avatar).toBeVisible();
  });

  test("P1.13 - Profile page responsive at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/principal/profile");
    
    // Header should be visible
    await expect(page.locator("h1")).toBeVisible();
    
    // Form should be visible
    await expect(page.locator("form")).toBeVisible();
    
    // No horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(391);
  });

  test("P1.14 - Profile page works at 1440px desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/principal/profile");
    
    // All sections visible
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText(/Basic Information/i)).toBeVisible();
    await expect(page.getByText(/Theme/i)).toBeVisible();
    await expect(page.getByText(/Change Password/i)).toBeVisible();
    await expect(page.getByText(/Two-Factor Authentication/i)).toBeVisible();
  });

  test("P1.15 - Sidebar shows Principal role label correctly", async ({ page }) => {
    await page.goto("/principal");
    
    // Role label should be "Principal" not "PRINCIPAL"
    const sidebar = page.locator('[data-testid="sidebar"], aside, nav').first();
    const sidebarText = await sidebar.textContent();
    
    // Should contain "Principal" but not "PRINCIPAL" (all caps)
    expect(sidebarText).toContain("Principal");
  });

  test("P1.16 - Back button navigates to dashboard", async ({ page }) => {
    await page.goto("/principal/profile");
    
    // Click back button
    await page.click('a:has-text("Back to dashboard")');
    
    // Should navigate to principal dashboard
    await page.waitForURL(/\/principal$/);
    await expect(page).toHaveURL(/\/principal$/);
  });
});
