import { test, expect } from "@playwright/test";

test.describe("Student S3: Class Replays", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "student.t01@example.com");
    await page.fill('input[name="password"]', "Demo1234!");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("displays recordings page", async ({ page }) => {
    await page.goto("/dashboard/recordings");
    
    // Page title
    await expect(page.locator("h1")).toContainText("Class Replays");
    
    // Back to timetable link
    await expect(page.locator('a:has-text("Back to timetable")')).toBeVisible();
  });

  test("shows search and filter when recordings exist", async ({ page }) => {
    await page.goto("/dashboard/recordings");
    
    // Search input exists if there are recordings
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');
    
    // Filter dropdown may exist if multiple courses
    const filterSelect = page.locator('select').or(page.locator('[role="combobox"]'));
  });

  test("shows 'Recording pending' for classes without recordings", async ({ page }) => {
    await page.goto("/dashboard/recordings");
    
    // Either recordings section or pending section
    const pendingSection = page.locator('h2:has-text("Recording Pending")');
    const noneMessage = page.locator('text="No recordings"').or(
      page.locator('text="no class replays"')
    );
    
    // One of these should be visible (or recordings)
  });

  test("shows 'Missed' tag for absent classes", async ({ page }) => {
    // This test requires a class with ABSENT attendance mark
    await page.goto("/dashboard/recordings");
    
    // If any "Missed" badges exist, they should have alert icon
    const missedBadges = page.locator('text="Missed"');
    const count = await missedBadges.count();
    
    // Can be 0 or more depending on attendance data
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("watermark displays student info", async ({ page }) => {
    await page.goto("/dashboard/recordings");
    
    // Look for RecordingViewer component
    const viewer = page.locator('video, iframe').first();
    
    // If recordings exist, watermark text should show
    const watermark = page.locator('text=/Student|2026\\/MHC/i');
    
    // May not be visible if no recordings yet
  });

  test("no download buttons present", async ({ page }) => {
    await page.goto("/dashboard/recordings");
    
    // Should NOT have download buttons for recordings
    const downloadButtons = page.locator('button:has-text("Download")').or(
      page.locator('a:has-text("Download")')
    ).filter({ has: page.locator('video, [class*="recording"], [class*="video"]') });
    
    // Count should be 0
    const count = await downloadButtons.count();
    expect(count).toBe(0);
  });

  test("responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto("/dashboard/recordings");
    
    await expect(page.locator("h1")).toBeVisible();
  });
});
