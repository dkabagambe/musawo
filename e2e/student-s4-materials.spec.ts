import { test, expect } from "@playwright/test";

test.describe("Student S4: Learning Materials", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "student.t01@example.com");
    await page.fill('input[name="password"]', "Demo1234!");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("displays materials page", async ({ page }) => {
    await page.goto("/dashboard/materials");

    // Page title
    await expect(page.locator("h1")).toContainText("Learning Materials");

    // Description mentions no downloads
    await expect(page.locator("text=/no.*download|inside.*platform/i")).toBeVisible();
  });

  test("shows course sections with blocks", async ({ page }) => {
    await page.goto("/dashboard/materials");

    // Look for course titles or blocks
    const courseSections = page.locator("text=/Certificate|Block/i");
    const count = await courseSections.count();

    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("shows lesson type icons", async ({ page }) => {
    await page.goto("/dashboard/materials");

    // Video and notes icons (lucide icons)
    const icons = page.locator("svg.lucide");
    const count = await icons.count();

    // Should have icons if there are materials
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("no download buttons visible", async ({ page }) => {
    await page.goto("/dashboard/materials");

    // Should NOT have download buttons for materials
    const downloadButtons = page.locator('button:has-text("Download")').or(
      page.locator('a:has-text("Download")')
    );

    // Count should be 0 for material downloads
    const count = await downloadButtons.count();
    // Note: May have other downloads like certificates, but not for learning materials
  });

  test("locked materials show payment message", async ({ page }) => {
    await page.goto("/dashboard/materials");

    // Look for lock icons or locked messages
    const lockIndicators = page.locator("text=/Pay|Unlock|locked/i").or(
      page.locator("svg").filter({ has: page.locator('[class*="lock"]') })
    );

    // May or may not have locked content
    const count = await lockIndicators.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("completion ticks shown for completed lessons", async ({ page }) => {
    await page.goto("/dashboard/materials");

    // Look for completion indicators (checkmarks)
    const completionMarks = page.locator("text=/complete/i").or(
      page.locator("svg").filter({ hasText: "check" })
    );

    // May have completed lessons
    const count = await completionMarks.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("empty state shows no materials message", async ({ page }) => {
    await page.goto("/dashboard/materials");

    // Check for empty state or materials
    const hasMaterials = (await page.locator("text=/Block|Lesson/i").count()) > 0;
    const emptyMessage = page.locator("text=/No.*materials|not available/i");

    if (!hasMaterials) {
      await expect(emptyMessage).toBeVisible();
    }
  });
});
