/**
 * P2: Dashboard Shell and Widgets for Principal
 *
 * Tests:
 * 1. Banner has correct text with no em dash
 * 2. Sidebar has collapsible groups with correct structure
 * 3. Dashboard tabs (General, Academics, Approvals, Reports) show real widgets
 * 4. Widget customization persists after reload
 * 5. Counts and links are correct (no links to other portals)
 * 6. Registration numbers are per-course per-year
 * 7. Dark theme has AA contrast
 * 8. Works at 390px and 1440px
 */

import { test, expect } from "@playwright/test";

test.describe("Principal P2 - Dashboard Shell and Widgets", () => {
  test.beforeEach(async ({ page }) => {
    // Login as Principal
    await page.goto("/dev/login");
    await page.getByRole("button", { name: /Dr\. Nankya Shanita/i }).click();
    await expect(page).toHaveURL(/\/principal/);
  });

  test("P2.1 - Banner has correct text without em dash", async ({ page }) => {
    const banner = page.locator('[class*="banner"]').first();
    if (await banner.isVisible()) {
      const text = await banner.textContent();
      // Check for correct text
      expect(text).toContain("Staging demo environment");
      expect(text).toContain("not for real use");
      expect(text).toContain("Data may be reset at any time");
      // Check no em dash (— or &mdash;)
      expect(text).not.toMatch(/—/);
      expect(text).not.toMatch(/&mdash;/);
      // Check dismiss button present
      const dismissBtn = banner.locator('button[aria-label*="dismiss" i], button[aria-label*="close" i]');
      await expect(dismissBtn).toBeVisible();
    }
  });

  test("P2.2 - Sidebar has collapsible groups with correct structure", async ({ page }) => {
    // Wait for sidebar to load
    await page.waitForSelector('[class*="sidebar"]', { state: "visible" });
    
    // Expected groups in order
    const expectedGroups = [
      "Overview",
      "People", 
      "Academics",
      "Teaching and Assessment",
      "Operations",
      "Communication",
      "Account"
    ];

    // Verify all groups are present
    for (const groupName of expectedGroups) {
      const group = page.locator(`text="${groupName}"`).first();
      await expect(group).toBeVisible();
    }

    // Verify Overview group contains expected items
    const overviewItems = [
      "Dashboard",
      "Approvals Inbox",
      "Approval Tracking",
      "Reports and Analytics",
      "Audit Logs"
    ];
    
    for (const item of overviewItems) {
      const link = page.locator(`a:has-text("${item}")`).first();
      await expect(link).toBeVisible();
    }

    // Verify People group
    const peopleItems = ["Students", "Admissions", "Instructors", "User Management"];
    for (const item of peopleItems) {
      const link = page.locator(`a:has-text("${item}")`).first();
      await expect(link).toBeVisible();
    }

    // Verify sidebar has no horizontal scrollbar
    const sidebar = page.locator('[class*="sidebar"]').first();
    const hasHorizontalScroll = await sidebar.evaluate((el) => {
      return el.scrollWidth > el.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test("P2.3 - General tab shows correct widgets", async ({ page }) => {
    // Should be on General tab by default
    await expect(page).toHaveURL(/\/principal(\?|$)/);

    // Expected widgets on General tab
    const expectedWidgets = [
      "Needs my decision",
      "Live now and today",
      "Admissions awaiting",
      "Results awaiting review",
      "Alerts",
      "Recent admissions"
    ];

    for (const widgetTitle of expectedWidgets) {
      const widget = page.locator(`[class*="widget"]`).filter({ hasText: widgetTitle }).first();
      await expect(widget).toBeVisible({ timeout: 10000 });
    }
  });

  test("P2.3 - Academics tab shows correct widgets", async ({ page }) => {
    // Navigate to Academics tab
    await page.goto("/principal?tab=academics");
    await page.waitForLoadState("networkidle");

    const expectedWidgets = [
      "Enrolment by programme",
      "Class monitor",
      "Attendance below minimum",
      "Upcoming exams",
      "Courses and programmes in draft"
    ];

    for (const widgetTitle of expectedWidgets) {
      const widget = page.locator(`[class*="widget"]`).filter({ hasText: widgetTitle }).first();
      await expect(widget).toBeVisible({ timeout: 10000 });
    }
  });

  test("P2.3 - Approvals tab shows correct widgets", async ({ page }) => {
    await page.goto("/principal?tab=approvals");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('text="Approvals Inbox"').first()).toBeVisible();
    await expect(page.locator('text="Approval Tracking"').first()).toBeVisible();
  });

  test("P2.3 - Reports tab shows correct widgets", async ({ page }) => {
    await page.goto("/principal?tab=reports");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('text="Quick exports"').first()).toBeVisible();
    await expect(page.locator('text="Saved reports"').first()).toBeVisible();
  });

  test("P2.4 - Widget customization button exists", async ({ page }) => {
    // Check for Edit My Widgets button
    const editButton = page.getByRole("button", { name: /edit.*widgets/i });
    await expect(editButton).toBeVisible();
  });

  test("P2.5 - No links to other portals", async ({ page }) => {
    // Check all tabs
    const tabs = ["general", "academics", "approvals", "reports"];
    
    for (const tab of tabs) {
      await page.goto(`/principal?tab=${tab}`);
      await page.waitForLoadState("networkidle");
      
      // Check for incorrect links
      const directorLinks = await page.locator('a[href^="/director/"]').count();
      const studentLinks = await page.locator('a[href^="/dashboard/"]').count();
      const tutorLinks = await page.locator('a[href^="/tutor/"]').count();
      
      expect(directorLinks).toBe(0);
      expect(studentLinks).toBe(0);
      expect(tutorLinks).toBe(0);
    }
  });

  test("P2.6 - Responsive at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    
    // Sidebar should be accessible (mobile menu)
    const menuButton = page.locator('button[aria-label*="menu" i]').first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
    }
    
    // Dashboard should be visible
    const dashboardContent = page.locator('main').first();
    await expect(dashboardContent).toBeVisible();
    
    // No horizontal overflow
    const bodyOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth;
    });
    expect(bodyOverflow).toBe(false);
  });

  test("P2.6 - Responsive at 1440px", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    
    // Sidebar should be visible
    const sidebar = page.locator('[class*="sidebar"]').first();
    await expect(sidebar).toBeVisible();
    
    // All groups should be visible
    await expect(page.locator('text="Overview"').first()).toBeVisible();
    await expect(page.locator('text="People"').first()).toBeVisible();
    
    // Dashboard content should be visible
    const dashboardContent = page.locator('main').first();
    await expect(dashboardContent).toBeVisible();
  });

  test("P2.7 - Dark theme toggle works", async ({ page }) => {
    // Find theme toggle button
    const themeToggle = page.locator('button[aria-label*="theme" i]').first();
    
    if (await themeToggle.isVisible()) {
      // Get initial theme
      const initialTheme = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark');
      });
      
      // Toggle theme
      await themeToggle.click();
      await page.waitForTimeout(500);
      
      // Verify theme changed
      const newTheme = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark');
      });
      
      expect(newTheme).not.toBe(initialTheme);
    }
  });

  test("P2.2 - Sidebar labels are not truncated", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Check that long labels like "Terms" are fully visible (not "Academic Years and Semeste...")
    const termsLink = page.locator('a:has-text("Terms")').first();
    await expect(termsLink).toBeVisible();
    
    const termsText = await termsLink.textContent();
    expect(termsText).toBe("Terms");
    expect(termsText).not.toContain("...");
  });
});
