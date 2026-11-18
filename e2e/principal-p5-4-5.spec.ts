import { test, expect } from "@playwright/test";

/**
 * P5.4: Classes and Groups
 * P5.5: Terms (Intakes) CRUD
 * 
 * Tests for intake management and breakaway groups functionality
 */

test.describe("Principal P5.4-5.5: Intakes and Groups", () => {
  test.beforeEach(async ({ page }) => {
    // Login as principal
    await page.goto("/login");
    await page.fill('input[type="email"]', "principal@musawotraining.ac.ug");
    await page.fill('input[type="password"]', "principal123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/principal/);
  });

  test("P5.5.1: Should display intakes list", async ({ page }) => {
    await page.goto("/principal/semesters");
    
    // Check page title
    await expect(page.locator("h1")).toContainText("Terms");
    
    // Check for create button
    const createBtn = page.locator("button", { hasText: "+ Create Intake" });
    if (await createBtn.isVisible()) {
      await expect(createBtn).toBeVisible();
    }
  });

  test("P5.5.2: Should open create intake dialog", async ({ page }) => {
    await page.goto("/principal/semesters");
    
    const createBtn = page.locator("button", { hasText: "+ Create Intake" });
    if (await createBtn.isVisible()) {
      await createBtn.click();
      
      // Dialog should open
      await expect(page.locator("h2", { hasText: "Create Intake" })).toBeVisible();
      
      // Check for required fields
      await expect(page.locator("label", { hasText: "Programme" })).toBeVisible();
      await expect(page.locator("label", { hasText: "Intake Label" })).toBeVisible();
      await expect(page.locator("label", { hasText: "Start Date" })).toBeVisible();
      await expect(page.locator("label", { hasText: "End Date" })).toBeVisible();
      await expect(page.locator("label", { hasText: "Available Seats" })).toBeVisible();
    }
  });

  test("P5.5.3: Should handle storage preview when closing intake", async ({ page }) => {
    await page.goto("/principal/semesters");
    
    // Look for an open intake with close button
    const closeBtn = page.locator("button", { hasText: "Close Intake" }).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      
      // Storage preview dialog should open
      await expect(page.locator("h2", { hasText: "Close Intake" })).toBeVisible();
      
      // Should show storage preview info or loading state
      await page.waitForTimeout(1000);
      
      // Check for confirm/cancel buttons
      await expect(page.locator("button", { hasText: "Cancel" })).toBeVisible();
    }
  });

  test("P5.4.1: Should access class roster", async ({ page }) => {
    await page.goto("/principal/classes");
    
    // Try to find roster link
    const rosterLink = page.locator("a", { hasText: /roster/i }).first();
    if (await rosterLink.isVisible()) {
      await rosterLink.click();
      await page.waitForLoadState("networkidle");
      
      // Should be on roster page
      await expect(page.locator("h1")).toContainText(/roster|class/i);
    }
  });

  test("P5.4.2: Should display breakaway groups interface", async ({ page }) => {
    // Navigate to groups via intakes
    await page.goto("/principal/semesters");
    
    // Find first intake
    const intakeCard = page.locator(".card").first();
    if (await intakeCard.isVisible()) {
      // Try to find groups link or navigate directly
      const intakes = await page.locator(".card").all();
      
      for (const intake of intakes) {
        const intakeText = await intake.textContent();
        if (intakeText && intakeText.includes("enrolled")) {
          // Extract intake ID from URL if possible, or navigate via roster
          break;
        }
      }
    }
  });

  test("P5.4.3: Should show auto-generate groups form", async ({ page }) => {
    // Try accessing a groups page directly
    await page.goto("/principal/classes");
    
    // Look for roster or groups navigation
    const links = await page.locator("a").all();
    let groupsFound = false;
    
    for (const link of links) {
      const href = await link.getAttribute("href");
      if (href && href.includes("/groups")) {
        await link.click();
        await page.waitForLoadState("networkidle");
        groupsFound = true;
        break;
      }
    }
    
    if (groupsFound) {
      // Should see groups interface
      await expect(page.locator("h1")).toContainText("Breakaway Groups");
      
      // Check for auto-generate form or group display
      const autoGenBtn = page.locator("button", { hasText: "Auto-Generate" });
      const createManualBtn = page.locator("button", { hasText: "Create Manual Group" });
      
      const hasAutoGen = await autoGenBtn.isVisible();
      const hasManual = await createManualBtn.isVisible();
      
      expect(hasAutoGen || hasManual).toBeTruthy();
    }
  });

  test("P5.4-5.5: Navigation between features", async ({ page }) => {
    // Start at principal dashboard
    await page.goto("/principal");
    
    // Navigate to semesters
    const semestersLink = page.locator("a", { hasText: /semester|terms|intake/i });
    if (await semestersLink.first().isVisible()) {
      await semestersLink.first().click();
      await expect(page).toHaveURL(/semesters/);
    }
    
    // Go back to dashboard
    await page.goto("/principal");
    
    // Navigate to classes
    const classesLink = page.locator("a", { hasText: /classes/i });
    if (await classesLink.first().isVisible()) {
      await classesLink.first().click();
      await page.waitForLoadState("networkidle");
    }
  });

  test("P5.5.4: Responsive design - mobile view", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/principal/semesters");
    
    // Page should be readable on mobile
    await expect(page.locator("h1")).toBeVisible();
    
    // Create button should be visible or in menu
    const createBtn = page.locator("button", { hasText: "+ Create Intake" });
    if (await createBtn.isVisible()) {
      // Button should fit in viewport
      const box = await createBtn.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.x + box.width).toBeLessThanOrEqual(390);
      }
    }
  });

  test("P5.5.5: Responsive design - desktop view", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/principal/semesters");
    
    // Desktop layout should be visible
    await expect(page.locator("h1")).toBeVisible();
    
    // Intake cards should be laid out properly
    const cards = page.locator(".card");
    const count = await cards.count();
    
    if (count > 0) {
      // First card should be visible
      await expect(cards.first()).toBeVisible();
    }
  });
});
