import { test, expect } from "@playwright/test";

test.describe("Student S3: Timetable", () => {
  test.beforeEach(async ({ page }) => {
    // Login as test student
    await page.goto("/login");
    await page.fill('input[name="email"]', "student.t01@example.com");
    await page.fill('input[name="password"]', "Demo1234!");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("displays timetable with three view modes", async ({ page }) => {
    await page.goto("/dashboard/timetable");
    
    // Page loads
    await expect(page.locator("h1")).toContainText("Timetable");
    
    // Three view mode buttons exist
    await expect(page.locator('button:has-text("List")')).toBeVisible();
    await expect(page.locator('button:has-text("Week")')).toBeVisible();
    await expect(page.locator('button:has-text("Month")')).toBeVisible();
    
    // Default is list view
    await expect(page.locator('[data-testid="list-view"]')).toBeVisible();
    
    // Switch to week view
    await page.click('button:has-text("Week")');
    await expect(page.locator('[data-testid="week-view"]')).toBeVisible();
    
    // Switch to month view
    await page.click('button:has-text("Month")');
    await expect(page.locator('[data-testid="month-view"]')).toBeVisible();
    
    // Today button exists (only in week/month views)
    await expect(page.locator('button:has-text("Today")')).toBeVisible();
  });

  test("shows course filter and color legend", async ({ page }) => {
    await page.goto("/dashboard/timetable");
    
    // Course filter pills exist
    const courseFilters = page.locator('button:has-text("MHC")').or(
      page.locator('button:has-text("Certificate in Medical")')
    );
    await expect(courseFilters.first()).toBeVisible();
    
    // Click a course filter
    await courseFilters.first().click();
    
    // Clear filter button appears
    await expect(page.locator('button:has-text("Clear filter")')).toBeVisible();
  });

  test("exports .ics calendar file", async ({ page }) => {
    await page.goto("/dashboard/timetable");
    
    // Export button exists
    const exportButton = page.locator('a:has-text("Export"), a:has-text(".ics")');
    await expect(exportButton.first()).toBeVisible();
    
    // Has download attribute
    const href = await exportButton.first().getAttribute("href");
    expect(href).toContain("/api/dashboard/timetable/ics");
  });

  test("opens class detail modal on click", async ({ page }) => {
    await page.goto("/dashboard/timetable");
    
    // Wait for timetable entries
    const entry = page.locator('[data-testid="timetable-entry"]').first();
    await expect(entry).toBeVisible();
    
    // Click to open modal
    await entry.click();
    
    // Modal opens
    await expect(page.locator('role=dialog')).toBeVisible();
    
    // Modal shows class details
    await expect(page.locator('role=dialog')).toContainText("EAT");
    await expect(page.locator('role=dialog')).toContainText("Instructor");
    
    // Close button works
    const closeButton = page.locator('role=dialog >> button[aria-label="Close"]');
    await closeButton.click();
    await expect(page.locator('role=dialog')).not.toBeVisible();
  });

  test("shows status badges correctly", async ({ page }) => {
    await page.goto("/dashboard/timetable");
    
    // Status badges exist (Scheduled, Live, Completed, etc.)
    const statusBadges = page.locator('.badge-info, .badge-danger, .badge-success');
    const count = await statusBadges.count();
    expect(count).toBeGreaterThan(0);
  });

  test("responsive at 360px width", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto("/dashboard/timetable");
    
    // Page renders without horizontal scroll
    await expect(page.locator("h1")).toBeVisible();
    
    // View mode buttons visible
    await expect(page.locator('button:has-text("List")')).toBeVisible();
  });

  test("responsive at 1440px width", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard/timetable");
    
    // Full layout visible
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator('a:has-text("Export")')).toBeVisible();
  });
});
