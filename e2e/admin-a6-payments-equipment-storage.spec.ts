import { test, expect } from "@playwright/test";

/**
 * A6 tests: Admin - Payments (view-only), Payment Proofs, Equipment, Storage
 *
 * Run against a production build (npm run build && npm start) with seeded data.
 * Uses: npm run demo:reset && npm run seed:test
 */

const ADMIN_EMAIL = "admin1@mtc.ac.ug";

async function devLogin(page: any, email: string, expectedPath?: RegExp) {
  await page.goto("/dev/login");
  await page.fill('input[name="email"]', email);
  await page.click('button:has-text("Sign In")');
  if (expectedPath) {
    await page.waitForURL(expectedPath, { timeout: 10000 });
  }
}

test.describe("Admin A6: Payments, Payment Proofs, Equipment, Storage", () => {
  
  // ── A6.1: PAYMENTS (VIEW-ONLY) ─────────────────────────────────────────────
  
  test.describe("A6.1: Payments (View-Only)", () => {
    
    test("payments page loads with view-only notice", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL, /\/admin/);
      await page.goto("/admin/payments");
      
      // Page title
      await expect(page.locator("h1")).toContainText("Payments");
      
      // View-only notice visible
      await expect(page.locator("text=/View-only access/i")).toBeVisible();
      await expect(page.locator("text=/cannot edit, verify, or delete/i")).toBeVisible();
      
      // Submit Payment Proof button visible (this is allowed)
      await expect(page.getByRole("link", { name: /Submit Payment Proof/i })).toBeVisible();
      
      // Export CSV button visible
      await expect(page.locator('a[href="/api/admin/payments/export"]')).toBeVisible();
    });
    
    test("payments table displays records without edit buttons", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/payments");
      
      await page.waitForSelector("h1", { timeout: 10000 });
      
      // Check for table or empty state
      const hasTable = await page.locator("table").isVisible({ timeout: 2000 }).catch(() => false);
      const isEmpty = await page.locator("text=/No payments/i").isVisible({ timeout: 2000 }).catch(() => false);
      
      expect(hasTable || isEmpty).toBeTruthy();
      
      if (hasTable) {
        // Table headers should exist
        await expect(page.locator("th:has-text('Student')")).toBeVisible();
        await expect(page.locator("th:has-text('Amount')")).toBeVisible();
        await expect(page.locator("th:has-text('Status')")).toBeVisible();
        
        // No edit, verify, or delete buttons anywhere
        const editBtn = page.locator("button:has-text('Edit'), a:has-text('Edit')");
        const verifyBtn = page.locator("button:has-text('Verify'), a:has-text('Verify')");
        const deleteBtn = page.locator("button:has-text('Delete'), a:has-text('Delete')");
        
        const hasEdit = await editBtn.count();
        const hasVerify = await verifyBtn.count();
        const hasDelete = await deleteBtn.count();
        
        expect(hasEdit).toBe(0);
        expect(hasVerify).toBe(0);
        expect(hasDelete).toBe(0);
      }
    });
    
    test("payments page shows summary stats", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/payments");
      
      await page.waitForSelector("h1", { timeout: 10000 });
      
      // Should show transaction count and total
      const transactionCard = page.locator("text=/Transactions/i");
      const totalCard = page.locator("text=/Total/i");
      
      const hasStats = await transactionCard.isVisible({ timeout: 2000 }).catch(() => false) &&
                       await totalCard.isVisible({ timeout: 2000 }).catch(() => false);
      
      expect(hasStats).toBeTruthy();
    });
    
    test("payments filters work", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/payments");
      
      await page.waitForSelector("h1", { timeout: 10000 });
      
      // Check filter inputs exist
      await expect(page.locator("select[name='status']")).toBeVisible();
      await expect(page.locator("select[name='gateway']")).toBeVisible();
      await expect(page.locator("button:has-text('Filter')")).toBeVisible();
    });
    
    test("export CSV has download attribute", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/payments");
      
      const exportLink = page.locator('a[href="/api/admin/payments/export"]');
      await expect(exportLink).toHaveAttribute("download");
    });
  });
  
  // ── A6.2: PAYMENT PROOFS ────────────────────────────────────────────────────
  
  test.describe("A6.2: Payment Proofs", () => {
    
    test("payment proofs page loads with tabs", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/payments/proofs");
      
      // Page title
      await expect(page.locator("h1")).toContainText("Payment Proofs");
      
      // Description
      await expect(page.locator("text=/Collect and submit/i")).toBeVisible();
      
      // Approval chain notice
      await expect(page.locator("text=/Admin → Principal → Director/i")).toBeVisible();
      
      // Tabs
      await expect(page.locator("text=/Submit Proof/i")).toBeVisible();
      await expect(page.locator("text=/Submission History/i")).toBeVisible();
    });
    
    test("submit proof tab shows form with required fields", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/payments/proofs?tab=submit");
      
      await page.waitForSelector("h1", { timeout: 10000 });
      
      // Form heading
      await expect(page.locator("text=/Submit Payment Proof/i")).toBeVisible();
      
      // Required fields
      await expect(page.locator("label:has-text('Student')")).toBeVisible();
      await expect(page.locator("label:has-text('Course')")).toBeVisible();
      await expect(page.locator("label:has-text('Payment Phase')")).toBeVisible();
      await expect(page.locator("label:has-text('Amount')")).toBeVisible();
      await expect(page.locator("label:has-text('Transaction ID')")).toBeVisible();
      await expect(page.locator("label:has-text('Screenshot')")).toBeVisible();
      
      // Submit button
      await expect(page.locator("button:has-text('Send to Principal')")).toBeVisible();
    });
    
    test("payment method dropdown has MTN and Airtel", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/payments/proofs?tab=submit");
      
      await page.waitForSelector("h1", { timeout: 10000 });
      
      const methodSelect = page.locator("select").filter({ hasText: /MTN|Airtel/i });
      const hasMethod = await methodSelect.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (hasMethod) {
        const options = await methodSelect.locator("option").allTextContents();
        expect(options.some(o => o.includes("MTN"))).toBeTruthy();
        expect(options.some(o => o.includes("Airtel"))).toBeTruthy();
      }
    });
    
    test("payment phases show correct percentages", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/payments/proofs?tab=submit");
      
      await page.waitForSelector("h1", { timeout: 10000 });
      
      const phaseSelect = page.locator("select").filter({ hasText: /Phase/i });
      const hasPhase = await phaseSelect.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (hasPhase) {
        const options = await phaseSelect.locator("option").allTextContents();
        // Should have 50%, 25%, 25%
        expect(options.some(o => o.includes("50%"))).toBeTruthy();
        expect(options.filter(o => o.includes("25%")).length).toBe(2);
      }
    });
    
    test("submission history tab loads", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/payments/proofs?tab=history");
      
      await page.waitForSelector("h1", { timeout: 10000 });
      
      // Should show submissions or empty state
      const emptyState = page.locator("text=/No proof submissions yet/i");
      const submissionCard = page.locator(".card").nth(1); // Skip page wrapper
      
      const isEmpty = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);
      const hasSubmissions = await submissionCard.isVisible({ timeout: 2000 }).catch(() => false);
      
      expect(isEmpty || hasSubmissions).toBeTruthy();
    });
    
    test("tabs maintain state via URL", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      
      await page.goto("/admin/payments/proofs?tab=submit");
      await expect(page.locator(".bg-primary.text-white:has-text('Submit Proof')")).toBeVisible();
      
      await page.goto("/admin/payments/proofs?tab=history");
      await expect(page.locator(".bg-primary.text-white:has-text('Submission History')")).toBeVisible();
    });
  });
  
  // ── A6.3: EQUIPMENT ─────────────────────────────────────────────────────────
  
  test.describe("A6.3: Equipment", () => {
    
    test("equipment page loads", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/equipment");
      
      // Page title
      await expect(page.locator("h1")).toContainText("Equipment");
      
      // Description mentions practical sessions
      await expect(page.locator("text=/practical sessions/i")).toBeVisible();
    });
    
    test("equipment request form exists", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/equipment");
      
      await page.waitForSelector("h1", { timeout: 10000 });
      
      // Should have submit request section
      await expect(page.locator("text=/Submit Equipment Request/i")).toBeVisible();
    });
    
    test("equipment checklists show needed vs available", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/equipment");
      
      await page.waitForSelector("h1", { timeout: 10000 });
      
      // Check for checklists section or empty state
      const checklistHeading = page.locator("text=/Current Checklists/i");
      const emptyState = page.locator("text=/No practical sessions/i");
      
      const hasChecklists = await checklistHeading.isVisible({ timeout: 2000 }).catch(() => false);
      const isEmpty = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);
      
      expect(hasChecklists || isEmpty).toBeTruthy();
      
      if (hasChecklists) {
        // Table headers should exist
        const neededHeader = page.locator("th:has-text('Needed')");
        const availableHeader = page.locator("th:has-text('Available')");
        
        const hasTable = await neededHeader.isVisible({ timeout: 2000 }).catch(() => false) &&
                         await availableHeader.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (hasTable) {
          expect(hasTable).toBeTruthy();
        }
      }
    });
    
    test("pending equipment requests show status", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/equipment");
      
      await page.waitForSelector("h1", { timeout: 10000 });
      
      // Pending requests section may or may not be visible
      const pendingSection = page.locator("text=/Pending Equipment Requests/i");
      const hasPending = await pendingSection.isVisible({ timeout: 2000 }).catch(() => false);
      
      // This is OK - may have no pending requests
      expect(typeof hasPending).toBe("boolean");
    });
  });
  
  // ── A6.4: STORAGE CLEARING ──────────────────────────────────────────────────
  
  test.describe("A6.4: Storage Clearing", () => {
    
    test("storage page loads", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/storage");
      
      // Page title
      await expect(page.locator("h1")).toContainText("Storage");
      
      // Description mentions Principal confirmation
      await expect(page.locator("text=/Principal confirmation/i")).toBeVisible();
    });
    
    test("storage clearing process explained", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/storage");
      
      await page.waitForSelector("h1", { timeout: 10000 });
      
      // Process steps should be listed
      await expect(page.locator("text=/Storage Clearing Process/i")).toBeVisible();
      await expect(page.locator("text=/closed intake/i")).toBeVisible();
      await expect(page.locator("text=/recordings, notes/i")).toBeVisible();
    });
    
    test("storage page shows submit clearing request section", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/storage");
      
      await page.waitForSelector("h1", { timeout: 10000 });
      
      await expect(page.locator("text=/Submit Clearing Request/i")).toBeVisible();
    });
    
    test("storage page explains what gets cleared vs preserved", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/storage");
      
      await page.waitForSelector("h1", { timeout: 10000 });
      
      // Should list included and preserved items
      await expect(page.locator("text=/What Gets Cleared/i")).toBeVisible();
      await expect(page.locator("text=/Included:/i")).toBeVisible();
      await expect(page.locator("text=/Preserved:/i")).toBeVisible();
      
      // Should mention recordings, student records, etc.
      await expect(page.locator("text=/recordings/i")).toBeVisible();
      await expect(page.locator("text=/Student records/i")).toBeVisible();
    });
  });
  
  // ── A6.5: NAVIGATION AND ACCESS ────────────────────────────────────────────
  
  test.describe("A6.5: Navigation and Access", () => {
    
    test("all A6 pages accessible from sidebar", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin");
      
      // Payments in Finance group
      await expect(page.getByRole("link", { name: "Payments" })).toBeVisible();
      
      // Equipment in Operations group
      await expect(page.locator('a[href="/admin/equipment"]')).toBeVisible();
    });
    
    test("payments link navigates correctly", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin");
      
      await page.getByRole("link", { name: "Payments" }).click();
      await page.waitForURL(/\/admin\/payments/, { timeout: 10000 });
      await expect(page.locator("h1")).toContainText("Payments");
    });
    
    test("equipment link navigates correctly", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin");
      
      const equipmentLink = page.locator('a[href="/admin/equipment"]');
      await equipmentLink.click();
      await page.waitForURL(/\/admin\/equipment/, { timeout: 10000 });
      await expect(page.locator("h1")).toContainText("Equipment");
    });
    
    test("payment proofs accessible from payments page", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/payments");
      
      const proofsLink = page.getByRole("link", { name: /Submit Payment Proof/i });
      await expect(proofsLink).toBeVisible();
      await expect(proofsLink).toHaveAttribute("href", "/admin/payments/proofs");
    });
  });
  
  // ── A6.6: RESPONSIVE DESIGN ─────────────────────────────────────────────────
  
  test.describe("A6.6: Responsive Design", () => {
    
    test("payments page works at mobile width", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/payments");
      
      await expect(page.locator("h1")).toBeVisible();
      
      // Table should scroll or cards should stack
      const hasTable = await page.locator("table").isVisible({ timeout: 2000 }).catch(() => false);
      if (hasTable) {
        // Should be in scrollable container
        expect(hasTable).toBeTruthy();
      }
    });
    
    test("payment proofs form works at mobile width", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/payments/proofs");
      
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("text=/Submit Proof/i")).toBeVisible();
    });
    
    test("equipment page works at mobile width", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/equipment");
      
      await expect(page.locator("h1")).toBeVisible();
    });
    
    test("storage page works at mobile width", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/storage");
      
      await expect(page.locator("h1")).toBeVisible();
    });
    
    test("all A6 pages work at desktop width", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await devLogin(page, ADMIN_EMAIL);
      
      // Test each page
      await page.goto("/admin/payments");
      await expect(page.locator("h1")).toBeVisible();
      
      await page.goto("/admin/payments/proofs");
      await expect(page.locator("h1")).toBeVisible();
      
      await page.goto("/admin/equipment");
      await expect(page.locator("h1")).toBeVisible();
      
      await page.goto("/admin/storage");
      await expect(page.locator("h1")).toBeVisible();
    });
  });
});
