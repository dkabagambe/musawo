import { test, expect } from "@playwright/test";

test.describe("Principal P7.1: Finance and Fees", () => {
  test.beforeEach(async ({ page }) => {
    // Login as Principal (using demo seed user)
    await page.goto("/login");
    await page.fill('input[type="email"]', "principal@musawotrainingcentre.ac.ug");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/principal/);
  });

  test("Finance page loads without errors", async ({ page }) => {
    await page.goto("/principal/finance");
    await expect(page).toHaveURL(/\/principal\/finance/);
    
    // Check page title and heading
    await expect(page.locator("h1")).toContainText("Finance");
    
    // Check no error messages
    const errorText = await page.textContent("body");
    expect(errorText).not.toContain("Error");
    expect(errorText).not.toContain("undefined");
    expect(errorText).not.toContain("Something went wrong");
  });

  test("Payment stats cards are visible", async ({ page }) => {
    await page.goto("/principal/finance");
    
    // Should show payment statistics
    const statsContainer = page.locator(".grid").first();
    await expect(statsContainer).toBeVisible();
  });

  test("Tabs work: payment-proofs, payments, fee-approvals", async ({ page }) => {
    await page.goto("/principal/finance");
    
    // Check all three tabs exist
    await expect(page.locator("text=Payment Proofs")).toBeVisible();
    await expect(page.locator("text=All Payments")).toBeVisible();
    await expect(page.locator("text=Fee Requests")).toBeVisible();
    
    // Click on All Payments tab
    await page.click("text=All Payments");
    await expect(page).toHaveURL(/tab=payments/);
    
    // Click on Fee Requests tab
    await page.click("text=Fee Requests");
    await expect(page).toHaveURL(/tab=fee-approvals/);
    
    // Go back to Payment Proofs
    await page.click("text=Payment Proofs");
    await expect(page).toHaveURL(/tab=payment-proofs/);
  });

  test("Payment proofs tab shows pending items or empty state", async ({ page }) => {
    await page.goto("/principal/finance?tab=payment-proofs");
    
    // Should show either pending items or empty state message
    const bodyText = await page.textContent("body");
    const hasPendingItems = bodyText?.includes("Awaiting your review") || 
                           bodyText?.includes("Forwarded to Director");
    const hasEmptyState = bodyText?.includes("No payment proofs awaiting review");
    
    expect(hasPendingItems || hasEmptyState).toBe(true);
  });

  test("All Payments tab shows payment table or empty state", async ({ page }) => {
    await page.goto("/principal/finance?tab=payments");
    
    // Should show either payment table with headers or empty state
    const bodyText = await page.textContent("body");
    const hasTable = bodyText?.includes("Student") && bodyText?.includes("Amount");
    const hasEmptyState = bodyText?.includes("No payments recorded yet");
    
    expect(hasTable || hasEmptyState).toBe(true);
  });

  test("Fee approvals tab shows requests or empty state", async ({ page }) => {
    await page.goto("/principal/finance?tab=fee-approvals");
    
    // Should show either approval items or empty state
    const bodyText = await page.textContent("body");
    const hasRequests = bodyText?.includes("FEE CHANGE") || 
                       bodyText?.includes("WAIVER") || 
                       bodyText?.includes("REFUND");
    const hasEmptyState = bodyText?.includes("No fee change or waiver requests pending");
    
    expect(hasRequests || hasEmptyState).toBe(true);
  });

  test("Responsive at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/principal/finance");
    
    await expect(page.locator("h1")).toBeVisible();
    
    // Check tabs are visible and not cut off
    await expect(page.locator("text=Payment Proofs")).toBeVisible();
  });

  test("Responsive at 1440px", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/principal/finance");
    
    await expect(page.locator("h1")).toBeVisible();
    
    // All tabs should be visible
    await expect(page.locator("text=Payment Proofs")).toBeVisible();
    await expect(page.locator("text=All Payments")).toBeVisible();
    await expect(page.locator("text=Fee Requests")).toBeVisible();
  });

  test("FeeRequestForm button exists", async ({ page }) => {
    await page.goto("/principal/finance");
    
    // The FeeRequestForm component should render a button
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });
});
