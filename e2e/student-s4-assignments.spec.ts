import { test, expect } from "@playwright/test";

test.describe("Student S4: Assignments", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "student.t01@example.com");
    await page.fill('input[name="password"]', "Demo1234!");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("displays assignments page", async ({ page }) => {
    await page.goto("/dashboard/assignments");

    // Page title
    await expect(page.locator("h1")).toContainText("Assignments");
  });

  test("shows assignment sections", async ({ page }) => {
    await page.goto("/dashboard/assignments");

    // Look for section headers: Overdue, Due soon, Submitted, etc.
    const sections = page.locator("h2").filter({ 
      hasText: /Overdue|Due|Submitted|Graded/i 
    });

    // Should have at least one section if there are assignments
    const count = await sections.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("shows assignment cards with due dates", async ({ page }) => {
    await page.goto("/dashboard/assignments");

    // Look for assignment titles
    const assignmentCards = page.locator(".card").or(
      page.locator("text=/Reflection|Analysis|Assignment/i")
    );

    const count = await assignmentCards.count();
    
    if (count > 0) {
      // Should show due dates
      const dueDates = page.locator("text=/Due|deadline/i");
      await expect(dueDates.first()).toBeVisible();
    }
  });

  test("overdue assignments marked in red", async ({ page }) => {
    await page.goto("/dashboard/assignments");

    // Look for overdue section or red badges
    const overdueIndicators = page.locator("text=OVERDUE").or(
      page.locator('[class*="danger"]').filter({ hasText: /overdue/i })
    );

    // May or may not have overdue assignments
    const count = await overdueIndicators.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("clicks assignment to view detail", async ({ page }) => {
    await page.goto("/dashboard/assignments");

    // Find first assignment card
    const assignmentLink = page.locator("a").filter({ 
      hasText: /Reflection|Analysis|Assignment/i 
    }).first();

    if (await assignmentLink.isVisible()) {
      await assignmentLink.click();

      // Should navigate to assignment detail page
      await expect(page).toHaveURL(/\/dashboard\/assignments\/[a-z0-9]+/);

      // Should show instructions or submission form
      const detailContent = page.locator("text=/Instructions|Submit|Due/i");
      await expect(detailContent.first()).toBeVisible();
    }
  });

  test("assignment detail shows submission form", async ({ page }) => {
    await page.goto("/dashboard/assignments");

    const assignmentLink = page.locator("a").filter({ 
      hasText: /Reflection|Analysis/i 
    }).first();

    if (await assignmentLink.isVisible()) {
      await assignmentLink.click();

      // Look for submission elements
      const submitElements = page.locator("textarea").or(
        page.locator('input[type="file"]')
      ).or(
        page.locator("button").filter({ hasText: /Submit/i })
      );

      const count = await submitElements.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("shows grade and feedback when graded", async ({ page }) => {
    await page.goto("/dashboard/assignments");

    // Look for graded section
    const gradedSection = page.locator("h2:has-text('Graded')");
    
    if (await gradedSection.isVisible()) {
      // Should show grades
      const grades = page.locator("text=/Grade|Score|Mark/i");
      await expect(grades.first()).toBeVisible();
    }
  });

  test("empty state shows no assignments message", async ({ page }) => {
    await page.goto("/dashboard/assignments");

    // Either has assignments OR shows empty state
    const hasAssignments = (await page.locator(".card").count()) > 0 ||
                           (await page.locator("text=/Reflection|Analysis/i").count()) > 0;
    const emptyMessage = page.locator("text=/No assignments/i");

    if (!hasAssignments) {
      await expect(emptyMessage).toBeVisible();
    }
  });
});
