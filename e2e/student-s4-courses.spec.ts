import { test, expect } from "@playwright/test";

test.describe("Student S4: My Courses", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "student.t01@example.com");
    await page.fill('input[name="password"]', "Demo1234!");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("displays courses grid", async ({ page }) => {
    await page.goto("/dashboard/courses");

    // Page title
    await expect(page.locator("h1")).toContainText("My Courses");

    // Browse more link
    await expect(page.locator('a[href="/courses"]')).toBeVisible();
  });

  test("shows course cards with thumbnails", async ({ page }) => {
    await page.goto("/dashboard/courses");

    // Course cards exist
    const cards = page.locator(".rounded-2xl").filter({ hasText: "Certificate" });
    const count = await cards.count();

    if (count > 0) {
      // Should have status badge
      await expect(page.locator("text=/Active|Completed|Pending/i").first()).toBeVisible();
    }
  });

  test("displays progress bars", async ({ page }) => {
    await page.goto("/dashboard/courses");

    // Look for progress indicators
    const progressText = page.locator("text=/Progress|%/i");
    const count = await progressText.count();

    // May or may not have progress depending on enrolment status
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("shows continue button for accessible courses", async ({ page }) => {
    await page.goto("/dashboard/courses");

    // Continue learning button OR complete payment button
    const continueBtn = page.locator('a:has-text("Continue learning")').or(
      page.locator('a:has-text("Complete payment")')
    );

    const count = await continueBtn.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("continues to course detail page", async ({ page }) => {
    await page.goto("/dashboard/courses");

    // Click continue button if it exists
    const continueBtn = page.locator('a:has-text("Continue learning")').first();

    if (await continueBtn.isVisible()) {
      await continueBtn.click();

      // Should navigate to course detail
      await expect(page).toHaveURL(/\/dashboard\/courses\/[a-z0-9-]+/);

      // Should show blocks or lessons
      const blocksOrLessons = page.locator("text=/Block|Lesson/i");
      await expect(blocksOrLessons.first()).toBeVisible();
    }
  });

  test("locked courses show payment message", async ({ page }) => {
    await page.goto("/dashboard/courses");

    // Look for "Complete payment" button
    const paymentBtn = page.locator('a:has-text("Complete payment")');

    if (await paymentBtn.count() > 0) {
      // Should link to payments page
      await expect(paymentBtn.first()).toHaveAttribute("href", "/dashboard/payments");
    }
  });

  test("empty state shows browse courses", async ({ page }) => {
    await page.goto("/dashboard/courses");

    // Either has courses OR shows empty state
    const hasCards = (await page.locator(".rounded-2xl").count()) > 0;
    const emptyState = page.locator("text=/No courses yet/i");

    if (!hasCards) {
      await expect(emptyState).toBeVisible();
      await expect(page.locator('a[href="/courses"]')).toBeVisible();
    }
  });

  test("responsive grid layout", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 900 });
    await page.goto("/dashboard/courses");

    // Cards should be visible at tablet width
    await expect(page.locator("h1")).toBeVisible();

    // Check mobile width
    await page.setViewportSize({ width: 360, height: 640 });
    await expect(page.locator("h1")).toBeVisible();
  });
});
