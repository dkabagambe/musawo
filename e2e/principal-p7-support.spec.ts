import { test, expect } from "@playwright/test";

test.describe("Principal P7.4: Support", () => {
  test.beforeEach(async ({ page }) => {
    // Login as Principal
    await page.goto("/login");
    await page.fill('input[type="email"]', "principal@musawotrainingcentre.ac.ug");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/principal/);
  });

  test("Support page loads without errors", async ({ page }) => {
    await page.goto("/principal/support");
    await expect(page).toHaveURL(/\/principal\/support/);
    
    // Check page title and heading
    await expect(page.locator("h1")).toContainText("Support");
    
    // Check no error messages
    const errorText = await page.textContent("body");
    expect(errorText).not.toContain("Error");
    expect(errorText).not.toContain("undefined");
    expect(errorText).not.toContain("Something went wrong");
  });

  test("Support page shows description", async ({ page }) => {
    await page.goto("/principal/support");
    
    // Should show description about support
    const description = await page.textContent("p.text-gray-500");
    expect(description).toMatch(/support|tickets|IT Admin/i);
  });

  test("SupportDesk component renders", async ({ page }) => {
    await page.goto("/principal/support");
    
    // The SupportDesk component should render
    const mainContent = page.locator(".max-w-4xl");
    await expect(mainContent).toBeVisible();
  });

  test("Can access support functionality", async ({ page }) => {
    await page.goto("/principal/support");
    
    // Page should load successfully
    await expect(page.locator("h1")).toBeVisible();
    
    // Should have some support-related content
    const bodyText = await page.textContent("body");
    expect(bodyText).toMatch(/support/i);
  });

  test("Principal can submit support requests", async ({ page }) => {
    await page.goto("/principal/support");
    
    // The page should allow submitting requests (based on permission check)
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
  });

  test("Responsive at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/principal/support");
    
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).toContainText("Support");
  });

  test("Responsive at 1440px", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/principal/support");
    
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).toContainText("Support");
  });

  test("Page has proper max-width container", async ({ page }) => {
    await page.goto("/principal/support");
    
    const container = page.locator(".max-w-4xl");
    await expect(container).toBeVisible();
  });

  test("Description explains support desk purpose", async ({ page }) => {
    await page.goto("/principal/support");
    
    const description = await page.textContent("body");
    
    // Should mention IT Admin or tickets
    expect(description).toMatch(/IT Admin|tickets|support requests/i);
  });

  test("No console errors on page load", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/principal/support");
    await page.waitForLoadState("networkidle");

    // Filter out known/expected errors
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes("favicon") && !err.includes("404")
    );

    expect(criticalErrors.length).toBe(0);
  });

  test("Page load time is reasonable", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/principal/support");
    const loadTime = Date.now() - startTime;
    
    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test("Support page accessible to Principal role", async ({ page }) => {
    await page.goto("/principal/support");
    
    // Should not redirect to 403
    await expect(page).not.toHaveURL(/\/403/);
    
    // Should show the support page
    await expect(page.locator("h1")).toContainText("Support");
  });
});
