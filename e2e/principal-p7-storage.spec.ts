import { test, expect } from "@playwright/test";

test.describe("Principal P7.3: Storage", () => {
  test.beforeEach(async ({ page }) => {
    // Login as Principal
    await page.goto("/login");
    await page.fill('input[type="email"]', "principal@musawotrainingcentre.ac.ug");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/principal/);
  });

  test("Storage page loads without errors", async ({ page }) => {
    await page.goto("/principal/storage");
    await expect(page).toHaveURL(/\/principal\/storage/);
    
    // Check page title and heading
    await expect(page.locator("h1")).toContainText("Storage");
    
    // Check no error messages
    const errorText = await page.textContent("body");
    expect(errorText).not.toContain("Error");
    expect(errorText).not.toContain("undefined");
    expect(errorText).not.toContain("Something went wrong");
  });

  test("Storage overview displays usage information", async ({ page }) => {
    await page.goto("/principal/storage");
    
    // Should show storage-related content
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    
    // Check description is present
    await expect(page.locator("text=/storage/i")).toBeVisible();
  });

  test("StorageDashboard component renders", async ({ page }) => {
    await page.goto("/principal/storage");
    
    // The page should render without crashing
    // Check if there's content beyond just the header
    const mainContent = page.locator("main, [role='main'], .max-w-5xl");
    await expect(mainContent).toBeVisible();
  });

  test("Cleanup jobs information visible if any exist", async ({ page }) => {
    await page.goto("/principal/storage");
    
    // Storage page should load successfully
    await expect(page.locator("h1")).toBeVisible();
    
    // The page mentions cleanup and trash period
    const bodyText = await page.textContent("body");
    expect(bodyText).toContain("14");
    expect(bodyText).toMatch(/trash|cleanup|cleared/i);
  });

  test("Responsive at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/principal/storage");
    
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).toContainText("Storage");
  });

  test("Responsive at 1440px", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/principal/storage");
    
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).toContainText("Storage");
  });

  test("Page describes storage policies", async ({ page }) => {
    await page.goto("/principal/storage");
    
    const description = await page.textContent("body");
    
    // Should mention key storage policies
    expect(description).toMatch(/recordings|notes|presentations/i);
    expect(description).toContain("14");
  });

  test("No console errors on page load", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/principal/storage");
    await page.waitForLoadState("networkidle");

    // Filter out known/expected errors if any
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes("favicon") && !err.includes("404")
    );

    expect(criticalErrors.length).toBe(0);
  });
});
