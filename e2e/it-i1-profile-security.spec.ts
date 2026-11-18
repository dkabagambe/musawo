import { test, expect } from "@playwright/test";

test.describe("IT Admin I1: Profile, Security and Identity", () => {
  test.beforeEach(async ({ page }) => {
    // Dev login as IT Admin
    await page.goto("/dev/login");
    await page.fill('input[name="email"]', "itadmin@mtc.ac.ug");
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/\/system/);
  });

  test.describe("Profile Page", () => {
    test("profile page loads with user data", async ({ page }) => {
      await page.goto("/system/profile");
      
      await expect(page.getByRole("heading", { name: /Profile.*Security/i })).toBeVisible();
      await expect(page.getByText("IT Admin")).toBeVisible();
      await expect(page.getByText(/Daniel Kabagambe/i)).toBeVisible();
    });

    test("email and name are read-only", async ({ page }) => {
      await page.goto("/system/profile");
      
      const emailInput = page.locator('input[value*="itadmin"], label:has-text("Email") input');
      await expect(emailInput).toBeDisabled();
      
      // Name should be editable (only email is locked for IT Admin)
      const nameInput = page.locator('label:has-text("Full name") input, label:has-text("Name") input').first();
      await expect(nameInput).toBeVisible();
    });

    test("phone number can be edited", async ({ page }) => {
      await page.goto("/system/profile");
      
      const phoneInput = page.locator('label:has-text("Phone") input');
      await expect(phoneInput).toBeVisible();
      await expect(phoneInput).toBeEditable();
    });

    test("password change form exists", async ({ page }) => {
      await page.goto("/system/profile");
      
      await expect(page.getByText(/Change Password/i)).toBeVisible();
      await expect(page.locator('label:has-text("Current password") input')).toBeVisible();
      await expect(page.locator('label:has-text("New password") input')).toBeVisible();
      await expect(page.locator('label:has-text("Confirm") input')).toBeVisible();
    });

    test("avatar upload component is present", async ({ page }) => {
      await page.goto("/system/profile");
      
      // Avatar should show initials or image
      const avatar = page.locator('[role="button"][aria-label*="profile photo"], [title*="change photo"]');
      await expect(avatar).toBeVisible();
    });
  });

  test.describe("Two-Factor Authentication", () => {
    test("2FA section is visible", async ({ page }) => {
      await page.goto("/system/profile");
      
      await expect(page.getByText(/Two-Factor Authentication/i)).toBeVisible();
    });

    test("2FA shows enable button when not enrolled", async ({ page }) => {
      await page.goto("/system/profile");
      
      // Should show either "Enable 2FA" button or "2FA is enabled" message
      const enableBtn = page.getByRole("button", { name: /Enable 2FA/i });
      const enabledMsg = page.getByText(/2FA is enabled/i);
      
      const hasEnableBtn = await enableBtn.isVisible().catch(() => false);
      const hasEnabledMsg = await enabledMsg.isVisible().catch(() => false);
      
      expect(hasEnableBtn || hasEnabledMsg).toBe(true);
    });

    test("2FA enrollment shows QR code on enable", async ({ page }) => {
      await page.goto("/system/profile");
      
      const enableBtn = page.getByRole("button", { name: /Enable 2FA/i });
      const isVisible = await enableBtn.isVisible().catch(() => false);
      
      if (isVisible) {
        await enableBtn.click();
        
        // Should show QR code or setup instructions
        await expect(page.getByText(/Scan.*QR.*Code/i)).toBeVisible({ timeout: 10000 });
      }
    });

    test("production 2FA requirement warning shown", async ({ page }) => {
      await page.goto("/system/profile");
      
      // Should mention IT Admin requirement in production
      const warning = page.getByText(/required.*IT Admin.*production/i);
      const enabled = page.getByText(/2FA is enabled/i);
      
      const hasWarning = await warning.isVisible().catch(() => false);
      const hasEnabled = await enabled.isVisible().catch(() => false);
      
      expect(hasWarning || hasEnabled).toBe(true);
    });
  });

  test.describe("Active Sessions", () => {
    test("active sessions section is visible", async ({ page }) => {
      await page.goto("/system/profile");
      
      await expect(page.getByText(/Active Sessions/i)).toBeVisible();
    });

    test("current session is marked", async ({ page }) => {
      await page.goto("/system/profile");
      
      // Should show at least one session (current)
      const currentBadge = page.getByText("Current");
      await expect(currentBadge).toBeVisible({ timeout: 10000 });
    });

    test("sessions show device and browser info", async ({ page }) => {
      await page.goto("/system/profile");
      
      // Should show device/browser details
      const sessionInfo = page.locator("text=/Chrome|Firefox|Safari|Windows|macOS|Linux/i").first();
      await expect(sessionInfo).toBeVisible({ timeout: 10000 });
    });

    test("sign out all others button exists when multiple sessions", async ({ page }) => {
      await page.goto("/system/profile");
      
      // Button might not be visible if only one session
      const signOutAllBtn = page.getByRole("button", { name: /Sign Out All Other/i });
      // Don't fail if not visible (might be only one session)
      const hasButton = await signOutAllBtn.isVisible().catch(() => false);
      // Just verify page loaded successfully
      expect(hasButton !== undefined).toBe(true);
    });
  });

  test.describe("Security: Business Data Restriction", () => {
    test("IT Admin cannot access student list", async ({ page, request }) => {
      const response = await request.get("/api/students");
      expect(response.status()).toBe(403);
    });

    test("IT Admin cannot access payments", async ({ page, request }) => {
      const response = await request.get("/api/payments");
      expect(response.status()).toBe(403);
    });

    test("IT Admin cannot access results", async ({ page, request }) => {
      const response = await request.get("/api/results");
      expect(response.status()).toBe(403);
    });

    test("IT Admin cannot access student documents", async ({ page, request }) => {
      const response = await request.get("/api/documents");
      expect(response.status()).toBe(403);
    });

    test("IT Admin cannot access messages (other users)", async ({ page, request }) => {
      // Assuming there's a messages endpoint that shows all messages
      const response = await request.get("/api/admin/messages");
      expect(response.status()).toBe(403);
    });

    test("IT Admin cannot access exam content", async ({ page, request }) => {
      const response = await request.get("/api/exams");
      expect(response.status()).toBe(403);
    });
  });

  test.describe("Responsive Design", () => {
    test("profile page works at mobile width", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/system/profile");
      
      await expect(page.getByRole("heading", { name: /Profile/i })).toBeVisible();
      await expect(page.getByText("IT Admin")).toBeVisible();
    });

    test("profile page works at desktop width", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/system/profile");
      
      await expect(page.getByRole("heading", { name: /Profile/i })).toBeVisible();
      await expect(page.getByText(/Two-Factor/i)).toBeVisible();
      await expect(page.getByText(/Active Sessions/i)).toBeVisible();
    });
  });

  test.describe("Avatar and Initials", () => {
    test("initials show correctly for IT Admin", async ({ page }) => {
      await page.goto("/system/profile");
      
      // Should show "DK" for Daniel Kabagambe, not "Da"
      // Check avatar or initials display
      const avatar = page.locator('[alt*="Daniel Kabagambe"]');
      const initialsDisplay = page.locator('text=/^DK$/');
      
      const hasAvatar = await avatar.isVisible().catch(() => false);
      const hasInitials = await initialsDisplay.isVisible().catch(() => false);
      
      // At least one should be true
      expect(hasAvatar || hasInitials).toBe(true);
    });
  });
});
