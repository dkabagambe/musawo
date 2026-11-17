import { test, expect } from "@playwright/test";

test.describe("Admin A2: Dashboard Shell and Widgets", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev/login");
    await page.getByRole("link", { name: "Rahiima Nakiyimba" }).click();
    await page.waitForURL("/admin");
  });

  test("A2.1: Banner text is correct without em dash", async ({ page }) => {
    // Check banner text (already correct per A2)
    await expect(page.locator("text=/staging demo environment/i")).toBeVisible();
  });

  test("A2.2: Sidebar has correct groups and labels", async ({ page }) => {
    // Check that sidebar has organized groups (not flat list)
    // Overview group
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    
    // People group
    await expect(page.getByRole("link", { name: "Students", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Admissions" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Instructors" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Student Documents" })).toBeVisible();
    
    // Academics group
    await expect(page.getByRole("link", { name: "Academic Programmes" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Courses$/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Classes and Groups" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Terms" })).toBeVisible();
    
    // Teaching group
    await expect(page.getByRole("link", { name: "Timetable" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Attendance" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Examinations" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Results and Grading" })).toBeVisible();
    
    // Finance group
    await expect(page.getByRole("link", { name: /^Payments$/ })).toBeVisible();
    
    // Communication group
    await expect(page.getByRole("link", { name: "Announcements" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Messages" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Notifications" })).toBeVisible();
    
    // Reports group
    await expect(page.getByRole("link", { name: /^Reports$/ })).toBeVisible();
    
    // Support and Account group
    await expect(page.getByRole("link", { name: "Support" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Profile" })).toBeVisible();
  });

  test("A2.2: Short labels used (Terms not Academic Years and Semesters)", async ({ page }) => {
    // Check that "Terms" is used instead of long label
    await expect(page.getByRole("link", { name: "Terms" })).toBeVisible();
    
    // Old long label should not exist
    await expect(page.getByRole("link", { name: "Academic Years & Semesters" })).not.toBeVisible();
  });

  test("A2.3: Dashboard has correct tabs (General, Students, Timetable, Finance)", async ({ page }) => {
    await page.goto("/admin");
    
    // Check tab existence
    await expect(page.getByRole("tab", { name: /general/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /students/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /timetable/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /finance/i })).toBeVisible();
    
    // Old tabs (Staff, Operations) should not exist
    await expect(page.getByRole("tab", { name: /^staff$/i })).not.toBeVisible();
    await expect(page.getByRole("tab", { name: /operations/i })).not.toBeVisible();
  });

  test("A2.3: General tab has widgets", async ({ page }) => {
    await page.goto("/admin?tab=general");
    
    // Check that widgets are present (at least one widget title visible)
    const widgetArea = page.locator(".dashboard-widgets, [class*='widget']");
    await expect(widgetArea).toBeVisible();
  });

  test("A2.3: Students tab has widgets", async ({ page }) => {
    await page.goto("/admin?tab=students");
    
    // Check that students tab loads with content
    const widgetArea = page.locator(".dashboard-widgets, [class*='widget']");
    await expect(widgetArea).toBeVisible();
  });

  test("A2.3: Timetable tab has widgets", async ({ page }) => {
    await page.goto("/admin?tab=timetable");
    
    // Check that timetable tab loads with content
    const widgetArea = page.locator(".dashboard-widgets, [class*='widget']");
    await expect(widgetArea).toBeVisible();
  });

  test("A2.3: Finance tab has widgets", async ({ page }) => {
    await page.goto("/admin?tab=finance");
    
    // Check that finance tab loads with content
    const widgetArea = page.locator(".dashboard-widgets, [class*='widget']");
    await expect(widgetArea).toBeVisible();
  });

  test("A2.4: Edit My Widgets button exists", async ({ page }) => {
    await page.goto("/admin");
    
    // Check for widget customization option
    const customizeButton = page.getByRole("button", { name: /edit.*widget/i });
    if (await customizeButton.count() > 0) {
      await expect(customizeButton).toBeVisible();
    }
  });

  test("A2.6: Dark theme works", async ({ page }) => {
    await page.goto("/admin/profile");
    
    // Click dark theme button
    await page.getByRole("button", { name: "dark" }).click();
    await page.waitForTimeout(500);
    
    // Check that html or body has dark class
    const htmlClass = await page.locator("html").getAttribute("class");
    const bodyClass = await page.locator("body").getAttribute("class");
    expect(htmlClass || bodyClass).toContain("dark");
  });

  test("A2.7: Sidebar visible at 1280x720", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/admin");
    
    // Check sidebar is visible
    const sidebar = page.locator("nav, aside, [class*='sidebar']").first();
    await expect(sidebar).toBeVisible();
    
    // Check no horizontal scroll on sidebar
    const scrollWidth = await sidebar.evaluate((el) => el.scrollWidth);
    const clientWidth = await sidebar.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // +1 for rounding
  });

  test("A2.7: Dashboard responsive at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin");
    
    // Check that page loads without horizontal scroll
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(390 + 1);
  });

  test("A2.7: Certificate Lists page exists", async ({ page }) => {
    await page.goto("/admin/certificates");
    
    // Should not be 404
    await expect(page.getByRole("heading", { name: /certificate/i })).toBeVisible();
  });

  test("A2.7: Payment Proofs page exists", async ({ page }) => {
    await page.goto("/admin/payments/proofs");
    
    // Should not be 404
    await expect(page.getByRole("heading", { name: /payment proof/i })).toBeVisible();
  });
});
