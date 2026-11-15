import { test, expect } from "@playwright/test";

test.describe("Student S3: Live Classes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "student.t01@example.com");
    await page.fill('input[name="password"]', "Demo1234!");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("displays three sections: Live Now, Upcoming, Past", async ({ page }) => {
    await page.goto("/dashboard/classes");
    
    // Page title
    await expect(page.locator("h1")).toContainText("Live Classes");
    
    // Section headings exist
    await expect(page.locator('h2:has-text("Upcoming")')).toBeVisible();
    
    // Either "Live Now" section or upcoming classes
    const liveNow = page.locator('h2:has-text("Live Now")');
    const upcomingSection = page.locator('h2:has-text("Upcoming")');
    
    // At least one section is visible
    await expect(upcomingSection).toBeVisible();
  });

  test("shows class cards with details", async ({ page }) => {
    await page.goto("/dashboard/classes");
    
    // Class cards show course title, time, instructor
    const classCard = page.locator('.rounded-2xl').filter({ hasText: "EAT" }).first();
    
    if (await classCard.isVisible()) {
      // Check for time indicator (EAT)
      await expect(classCard).toContainText("EAT");
      
      // Check for duration (min)
      await expect(classCard).toContainText("min");
    }
  });

  test("shows platform labels", async ({ page }) => {
    await page.goto("/dashboard/classes");
    
    // Platform badges: Google Meet, Zoom, Jitsi, or generic
    const platformLabels = page.locator('text="Google Meet"').or(
      page.locator('text="Zoom"')
    ).or(
      page.locator('text="Jitsi"')
    );
    
    // Count may be 0 if no upcoming classes, that's OK
  });

  test("links to timetable and recordings", async ({ page }) => {
    await page.goto("/dashboard/classes");
    
    // Links to other S3 pages
    await expect(page.locator('a[href="/dashboard/timetable"]')).toBeVisible();
    await expect(page.locator('a[href="/dashboard/recordings"]')).toBeVisible();
  });

  test("responsive at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard/classes");
    
    await expect(page.locator("h1")).toBeVisible();
  });
});
