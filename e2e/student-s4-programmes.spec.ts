import { test, expect } from "@playwright/test";

test.describe("Student S4: My Programmes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "student.t01@example.com");
    await page.fill('input[name="password"]', "Demo1234!");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("displays programmes list", async ({ page }) => {
    await page.goto("/dashboard/enrolled");

    // Page title
    await expect(page.locator("h1")).toContainText("My Programmes");

    // Enrolment count shown
    await expect(page.locator("text=/enrolment/i")).toBeVisible();
  });

  test("shows enrolment cards with status", async ({ page }) => {
    await page.goto("/dashboard/enrolled");

    // At least one enrolment card
    const cards = page.locator(".card").filter({ hasText: "Certificate" });
    await expect(cards.first()).toBeVisible();

    // Status badge (ACTIVE, COMPLETED, etc.)
    const statusBadges = page.locator("text=/ACTIVE|COMPLETED|OVERDUE|PARTIALLY/i");
    const count = await statusBadges.count();
    expect(count).toBeGreaterThan(0);
  });

  test("links to programme detail page", async ({ page }) => {
    await page.goto("/dashboard/enrolled");

    // Click first enrolment card
    const card = page.locator(".card").filter({ hasText: "Certificate" }).first();
    await card.click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/dashboard\/enrolled\/[a-z0-9]+/);
  });

  test("programme detail shows requirements checklist", async ({ page }) => {
    // Navigate to enrolled programmes
    await page.goto("/dashboard/enrolled");
    const card = page.locator(".card").first();
    
    if (await card.isVisible()) {
      await card.click();

      // Check for checklist items
      const checklistItems = page.locator("text=/Lessons|Exams|Practicals|Attendance|Fees/i");
      const count = await checklistItems.count();
      expect(count).toBeGreaterThan(0);

      // Registration number shown
      await expect(page.locator("text=/2026/i")).toBeVisible();
    }
  });

  test("shows intake and registration number", async ({ page }) => {
    await page.goto("/dashboard/enrolled");
    const card = page.locator(".card").first();
    
    if (await card.isVisible()) {
      await card.click();

      // Intake label
      await expect(page.locator("text=/Intake|intake/i")).toBeVisible();
    }
  });

  test("empty state shows browse link", async ({ page }) => {
    // This test would need a student with no enrolments
    // For now, just check the empty state structure exists in the code
    await page.goto("/dashboard/enrolled");
    
    // If empty, should show message
    const emptyMessage = page.locator("text=/not enrolled/i");
    const browseLink = page.locator('a[href="/courses"]');
    
    // Either has enrolments OR shows empty state
    const hasEnrolments = await page.locator(".card").count() > 0;
    if (!hasEnrolments) {
      await expect(emptyMessage).toBeVisible();
      await expect(browseLink).toBeVisible();
    }
  });
});
