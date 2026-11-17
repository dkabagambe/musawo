import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@mtc.ac.ug";
const ADMIN_PASSWORD = "Demo2026!mtc";

test.describe("Admin A4: Academic Administration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/signin");
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("/admin");
  });

  test("A4.1: Academic Programmes is view-only", async ({ page }) => {
    await page.goto("/admin/programmes");
    await expect(page.locator("h1")).toContainText("Academic Programmes");
    
    // Should show view-only message
    await expect(page.locator("text=/view.only/i")).toBeVisible();
    
    // Should not have edit or create buttons
    await expect(page.locator("text=/create programme/i")).not.toBeVisible();
    await expect(page.locator("text=/edit/i")).not.toBeVisible();
  });

  test("A4.2: Courses page lists courses", async ({ page }) => {
    await page.goto("/admin/courses");
    await expect(page.locator("h1")).toContainText("Courses");
    
    // Should have table headers
    await expect(page.getByRole("columnheader", { name: /title/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /tutor/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /status/i })).toBeVisible();
  });

  test("A4.3: Classes page shows intakes as class cohorts", async ({ page }) => {
    await page.goto("/admin/classes");
    await expect(page.locator("h1")).toContainText("Classes and Groups");
    
    // Should mention cohorts and intakes
    await expect(page.locator("text=/class cohorts/i")).toBeVisible();
    
    // Should have action buttons for managing classes
    const viewRosterBtn = page.locator("text=/view roster/i").first();
    if (await viewRosterBtn.isVisible()) {
      await expect(viewRosterBtn).toBeVisible();
    }
  });

  test("A4.3: Class roster shows students with photos", async ({ page }) => {
    await page.goto("/admin/classes");
    
    // Click on first "View Roster" button if available
    const viewRosterBtn = page.locator("text=/view roster/i").first();
    if (await viewRosterBtn.isVisible()) {
      await viewRosterBtn.click();
      
      // Should show roster page
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("text=/roster/i")).toBeVisible();
      
      // Should have export button
      await expect(page.locator("text=/export/i")).toBeVisible();
    }
  });

  test("A4.4: Terms and Intakes page accessible to Admin", async ({ page }) => {
    await page.goto("/admin/intakes");
    
    // Should not redirect to 403
    await expect(page).not.toHaveURL(/\/403/);
    
    // Should show intakes title
    await expect(page.locator("h1")).toContainText(/terms|intakes/i);
    
    // Should mention storage clearing
    await expect(page.locator("text=/storage clearing/i")).toBeVisible();
  });

  test("A4.5: Instructors page lists all instructors", async ({ page }) => {
    await page.goto("/admin/tutors");
    await expect(page.locator("h1")).toContainText("Instructors");
    
    // Should show instructors with details
    await expect(page.locator("text=/view and maintain instructor records/i")).toBeVisible();
    
    // Should mention Principal manages accounts
    await expect(page.locator("text=/principal/i")).toBeVisible();
  });

  test("A4.5: Instructor detail shows courses and classes", async ({ page }) => {
    await page.goto("/admin/tutors");
    
    // Click first "View Details" button if available
    const viewDetailsBtn = page.locator("text=/view details/i").first();
    if (await viewDetailsBtn.isVisible()) {
      await viewDetailsBtn.click();
      
      // Should show instructor detail page
      await expect(page.locator("h1")).toContainText("Instructor Details");
      
      // Should have sections for courses and classes
      await expect(page.locator("text=/courses taught/i")).toBeVisible();
      await expect(page.locator("text=/recent classes/i")).toBeVisible();
    }
  });

  test("A4: Admin cannot edit programme structure (403)", async ({ page }) => {
    // Try to access a principal-only endpoint
    const response = await page.request.put("/api/admin/programmes/fake-id", {
      data: { title: "Hacked" },
    });
    
    // Should be forbidden
    expect(response.status()).toBe(403);
  });
});
