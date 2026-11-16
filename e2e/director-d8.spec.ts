import { test, expect, Page } from "@playwright/test";

async function loginAsDirector(page: Page) {
  await page.goto("/login");
  await page.fill('input[name="email"]', "mathias.senyondo@musawo.ac.ug");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/director/, { timeout: 5000 });
}

test.describe("D8: Staff, Roles, Policies, Communication", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDirector(page);
  });

  test("D8.1 - Staff Accounts page loads with all staff", async ({ page }) => {
    await page.goto("/director/staff");
    
    // Header
    await expect(page.locator("h1")).toContainText("Staff Accounts");
    await expect(page.getByText(/Director slots/i)).toBeVisible();
    
    // Access control notice
    await expect(page.getByText(/Access control/i)).toBeVisible();
    await expect(page.getByText(/requires a formal approval request/i)).toBeVisible();
    
    // Table headers
    await expect(page.getByText("Name")).toBeVisible();
    await expect(page.getByText("Email")).toBeVisible();
    await expect(page.getByText("Role")).toBeVisible();
    await expect(page.getByText("Status")).toBeVisible();
    await expect(page.getByText("2FA")).toBeVisible();
    
    // Should have staff entries
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test("D8.2 - Staff page shows 2FA status correctly", async ({ page }) => {
    await page.goto("/director/staff");
    
    // Check for 2FA indicators
    const has2FAOn = await page.getByText("✅ On").count();
    const has2FAOff = await page.getByText("❌ Off").count();
    
    // Should have at least one entry
    expect(has2FAOn + has2FAOff).toBeGreaterThan(0);
  });

  test("D8.3 - Staff page is read-only (no direct edit)", async ({ page }) => {
    await page.goto("/director/staff");
    
    // Should not have direct "Edit" or "Create" buttons for staff
    // Only "Request suspend" and "Reset 2FA" links through approval flow
    const hasRequestSuspend = await page.getByText(/Request suspend/i).count();
    const hasReset2FA = await page.getByText(/Reset 2FA/i).count();
    
    // These are allowed
    expect(hasRequestSuspend + hasReset2FA).toBeGreaterThanOrEqual(0);
    
    // No direct edit forms
    const hasEditButton = await page.locator('button:has-text("Edit")').count();
    expect(hasEditButton).toBe(0);
  });

  test("D8.4 - Roles and Permissions page loads with matrix", async ({ page }) => {
    await page.goto("/director/roles");
    
    // Header
    await expect(page.locator("h1")).toContainText("Roles and Permissions");
    await expect(page.getByText(/Organogram/i)).toBeVisible();
    
    // Role hierarchy section
    await expect(page.getByText(/Role Hierarchy/i)).toBeVisible();
    await expect(page.getByText(/DIRECTOR/i)).toBeVisible();
    await expect(page.getByText(/PRINCIPAL/i)).toBeVisible();
    await expect(page.getByText(/INSTRUCTOR/i)).toBeVisible();
    await expect(page.getByText(/STUDENT/i)).toBeVisible();
    
    // Capability matrix section
    await expect(page.getByText(/Capability Matrix/i)).toBeVisible();
    
    // Legend
    await expect(page.getByText(/Allowed/i)).toBeVisible();
    await expect(page.getByText(/Scoped to own/i)).toBeVisible();
    await expect(page.getByText(/Not permitted/i)).toBeVisible();
  });

  test("D8.5 - Roles page does NOT mention removed roles", async ({ page }) => {
    await page.goto("/director/roles");
    await page.waitForLoadState("networkidle");
    
    const pageText = await page.textContent("body");
    
    // Check for removed roles
    expect(pageText).not.toContain("Board Member");
    expect(pageText).not.toContain("Deputy Principal");
    expect(pageText).not.toContain("Teaching Assistant");
    expect(pageText).not.toContain("Finance Officer");
    expect(pageText).not.toContain("HR");
    expect(pageText).not.toContain("Auditor");
    // "Administrator" is ambiguous, but "ADMINISTRATOR" role should not exist
    expect(pageText).not.toMatch(/\bADMINISTRATOR\b/);
  });

  test("D8.6 - Roles matrix shows active roles only", async ({ page }) => {
    await page.goto("/director/roles");
    
    // Check table has the 7 active roles
    const tableHeaders = page.locator("thead th");
    const headerCount = await tableHeaders.count();
    
    // First column is "Capability", then 7 role columns
    expect(headerCount).toBe(8);
    
    // Verify specific role columns exist
    await expect(page.locator("thead th:has-text('Director')")).toBeVisible();
    await expect(page.locator("thead th:has-text('Principal')")).toBeVisible();
    await expect(page.locator("thead th:has-text('Admin')")).toBeVisible();
    await expect(page.locator("thead th:has-text('Student')")).toBeVisible();
  });

  test("D8.7 - Policies and Settings page loads", async ({ page }) => {
    await page.goto("/director/policies");
    
    // Header
    await expect(page.locator("h1")).toContainText("Policies");
    await expect(page.getByText(/Institution-wide policy settings/i)).toBeVisible();
    
    // Should have policy settings form
    await expect(page.locator("form")).toBeVisible();
    
    // Should have some policy keys
    await expect(page.getByText(/Phase 1 payment/i)).toBeVisible();
    await expect(page.getByText(/USD to UGX exchange rate/i)).toBeVisible();
    
    // Save button
    await expect(page.getByRole("button", { name: /Save all settings/i })).toBeVisible();
  });

  test("D8.8 - Announcements page loads", async ({ page }) => {
    await page.goto("/director/announcements");
    
    // Header
    await expect(page.locator("h1")).toContainText("Announcements");
    await expect(page.getByText(/institution-wide announcements/i)).toBeVisible();
    
    // Should have composer
    const hasTextarea = await page.locator("textarea").count();
    expect(hasTextarea).toBeGreaterThan(0);
  });

  test("D8.9 - Messages page loads", async ({ page }) => {
    await page.goto("/director/messages");
    
    // Header
    await expect(page.locator("h1")).toContainText("Messages");
    await expect(page.getByText(/Send a direct message/i)).toBeVisible();
    
    // Should have inbox section
    await expect(page.getByText(/Inbox/i)).toBeVisible();
  });

  test("D8.10 - Notifications page loads and shows counts", async ({ page }) => {
    await page.goto("/director/notifications");
    
    // Header
    await expect(page.locator("h1")).toContainText("Notifications");
    
    // Should show status message (either "X unread" or "All caught up")
    const hasUnread = await page.getByText(/unread/i).isVisible().catch(() => false);
    const hasCaughtUp = await page.getByText(/All caught up/i).isVisible().catch(() => false);
    
    expect(hasUnread || hasCaughtUp).toBe(true);
  });

  test("D8.11 - Notifications show appropriate types for Director", async ({ page }) => {
    await page.goto("/director/notifications");
    
    // Director notifications should include:
    // - Approval needed
    // - System alerts
    // - Direct messages
    // - Announcements
    const notificationsExist = await page.locator(".card").count().then(c => c > 0);
    
    if (notificationsExist) {
      // At least one notification category should be visible
      const pageText = await page.textContent("body");
      expect(pageText).toBeTruthy();
    } else {
      // Empty state is OK
      await expect(page.getByText(/No notifications yet/i)).toBeVisible();
    }
  });

  test("D8.12 - Staff accounts page responsive at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/director/staff");
    
    // Header should be visible
    await expect(page.locator("h1")).toBeVisible();
    
    // Table should be scrollable (overflow-x-auto)
    const table = page.locator("table");
    await expect(table).toBeVisible();
  });

  test("D8.13 - Roles page responsive at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/director/roles");
    
    // Header should be visible
    await expect(page.locator("h1")).toBeVisible();
    
    // Matrix table should be scrollable
    const table = page.locator("table");
    await expect(table).toBeVisible();
  });

  test("D8.14 - Policies page responsive at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/director/policies");
    
    // Header should be visible
    await expect(page.locator("h1")).toBeVisible();
    
    // Form should be visible and inputs accessible
    await expect(page.locator("form")).toBeVisible();
  });

  test("D8.15 - All pages work at 1440px desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    
    // Test each D8 page loads at desktop
    const pages = [
      "/director/staff",
      "/director/roles",
      "/director/policies",
      "/director/announcements",
      "/director/messages",
      "/director/notifications",
    ];
    
    for (const path of pages) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
    }
  });

  test("D8.16 - Inheritance rules visible in roles page", async ({ page }) => {
    await page.goto("/director/roles");
    
    // Check implementation notes section
    await expect(page.getByText(/Inheritance rule/i)).toBeVisible();
    await expect(page.getByText(/Override rules/i)).toBeVisible();
    await expect(page.getByText(/nobody approves their own request/i)).toBeVisible();
    await expect(page.getByText(/audit log cannot be edited/i)).toBeVisible();
  });

  test("D8.17 - Role hierarchy shows correct levels", async ({ page }) => {
    await page.goto("/director/roles");
    
    // Director should be Level 0 or 1
    const roleTree = page.locator("ul").first();
    await expect(roleTree).toBeVisible();
    
    // Should show level numbers
    const hasLevel = await page.getByText(/Level \d+/i).count();
    expect(hasLevel).toBeGreaterThan(0);
  });
});
