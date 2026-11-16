import { test, expect, request as apiRequest } from "@playwright/test";

// S6: My Fees and Access
// Tests cover: fee phases with status, payment hold, claim form (MoMo only),
// receipt download, duplicate transaction ID rejection, cross-student isolation.

const PASSWORD = "Demo1234!";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard", { timeout: 15000 });
}

test.describe("Student S6: My Fees and Access", () => {
  test.describe("Fee phases and status", () => {
    test("payments page shows fee phases for new student", async ({ page }) => {
      await login(page, "student.new@example.com");
      await page.goto("/dashboard/payments");

      await expect(page.locator("#main-content h1")).toContainText("My Fees");
      // Should show fee phases section
      await expect(page.locator("text=Fee Phases")).toBeVisible();
      // Should show the three phases
      await expect(page.locator("text=50% before reporting")).toBeVisible();
      await expect(page.locator("text=25% mid-course")).toBeVisible();
      await expect(page.locator("text=25% final")).toBeVisible();
    });

    test("completed student sees approved phases and fully paid", async ({ page }) => {
      await login(page, "student.completed@example.com");
      await page.goto("/dashboard/payments");

      // Should show fee phases
      await expect(page.locator("text=Fee Phases")).toBeVisible();
      // Should show "Fully paid" for remaining
      await expect(page.locator("text=Fully paid")).toBeVisible();
    });

    test("overdue student sees payment hold banner", async ({ page }) => {
      await login(page, "student.overdue@example.com");
      await page.goto("/dashboard/payments");

      // Should show payment hold banner
      await expect(page.locator("text=Payment hold")).toBeVisible();
      // Should show Pay now link
      await expect(page.locator("text=Pay now")).toBeVisible();
    });
  });

  test.describe("Submit proof of payment form", () => {
    test("claim form shows only Mobile Money options (no bank, no cash)", async ({ page }) => {
      await login(page, "student.new@example.com");
      await page.goto("/dashboard/payments/claim");

      // MTN and Airtel should be visible
      await expect(page.locator("text=MTN Mobile Money")).toBeVisible();
      await expect(page.locator("text=Airtel Money")).toBeVisible();

      // Bank Transfer and Cash should NOT be options
      const bankRadio = page.locator('input[value="BANK_TRANSFER"]');
      expect(await bankRadio.count()).toBe(0);
      const cashRadio = page.locator('input[value="CASH"]');
      expect(await cashRadio.count()).toBe(0);

      // Should show merchant codes
      await expect(page.locator("text=Merchant code")).toBeVisible();
      await expect(page.locator("text=Merchant ID")).toBeVisible();
    });

    test("claim form has screenshot upload option", async ({ page }) => {
      await login(page, "student.new@example.com");
      await page.goto("/dashboard/payments/claim");

      // Should show screenshot upload option
      await expect(page.locator("text=/screenshot/i")).toBeVisible();
    });
  });

  test.describe("Receipts", () => {
    test("completed student can download receipt PDF", async ({ page }) => {
      await login(page, "student.completed@example.com");
      await page.goto("/dashboard/payments");

      // Find receipt download link
      const receiptLink = page.locator('a[href*="/api/payments/"][href*="/receipt"]').first();
      expect(await receiptLink.count()).toBeGreaterThan(0);

      // Download the receipt
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        receiptLink.click(),
      ]);

      const filename = download.suggestedFilename();
      expect(filename).toContain("receipt");
      expect(filename).toMatch(/\.pdf$/);
    });
  });

  test.describe("Duplicate transaction ID rejection (API)", () => {
    test("API rejects duplicate transaction ID", async ({ browser }) => {
      const page = await browser.newPage();
      await login(page, "student.new@example.com");
      await page.goto("/dashboard/payments");

      // Get an enrolment ID from the page
      const enrolmentLink = page.locator('a[href*="/dashboard/payments/claim"]').first();
      await enrolmentLink.click();
      await page.waitForLoadState("networkidle");

      // Get session cookies for API calls
      const cookies = await page.context().cookies();
      const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
      const apiContext = await apiRequest.newContext({
        extraHTTPHeaders: { Cookie: cookieStr },
      });

      // Find the enrolment ID from the select dropdown
      const enrolmentId = await page.locator("select#enrolmentId option").first().getAttribute("value");
      if (!enrolmentId) {
        test.skip();
        return;
      }

      // Submit a claim with a unique transaction ID
      const txId = `TEST-S6-${Date.now()}`;
      const res1 = await apiContext.post("http://localhost:3000/api/payments/claim", {
        data: {
          enrolmentId,
          method: "MOBILE_MONEY_MTN",
          transactionId: txId,
          amount: 500000,
          payerName: "Test Student",
          payerPhone: "0771234567",
          bankOrProvider: "MTN MoMo",
          claimedAt: new Date().toISOString(),
        },
      });
      expect(res1.ok()).toBeTruthy();

      // Try to submit again with the SAME transaction ID - should be rejected
      const res2 = await apiContext.post("http://localhost:3000/api/payments/claim", {
        data: {
          enrolmentId,
          method: "MOBILE_MONEY_MTN",
          transactionId: txId,
          amount: 250000,
          payerName: "Test Student",
          payerPhone: "0771234567",
          bankOrProvider: "MTN MoMo",
          claimedAt: new Date().toISOString(),
        },
      });
      expect(res2.ok()).toBeFalsy();
      const errData = await res2.json();
      expect(errData.error).toContain("already exists");

      // Clean up: delete the claim
      await PGPASSWORD_mtc12345_psql(enrolmentId, txId);

      await apiContext.dispose();
      await page.close();
    });
  });

  test.describe("Cross-student isolation", () => {
    test("student cannot download another student's receipt", async ({ browser }) => {
      // Login as student A
      const pageA = await browser.newPage();
      await login(pageA, "student.new@example.com");

      // Login as student B (completed) to find a payment ID
      const pageB = await browser.newPage();
      await login(pageB, "student.completed@example.com");
      await pageB.goto("/dashboard/payments");

      // Get a payment ID from the completed student's receipt link
      const receiptHref = await pageB
        .locator('a[href*="/api/payments/"][href*="/receipt"]')
        .first()
        .getAttribute("href");
      await pageB.close();

      if (!receiptHref) {
        test.skip();
        return;
      }

      // Try to download it as student A (new student)
      const cookiesA = await pageA.context().cookies();
      const cookieStr = cookiesA.map((c) => `${c.name}=${c.value}`).join("; ");
      const apiContext = await apiRequest.newContext({
        extraHTTPHeaders: { Cookie: cookieStr },
      });

      const res = await apiContext.get(`http://localhost:3000${receiptHref}`);
      // Should be forbidden (403) since the payment belongs to another student
      expect(res.status()).toBe(403);

      await apiContext.dispose();
      await pageA.close();
    });
  });
});

/** Helper: clean up test claim via psql. */
async function PGPASSWORD_mtc12345_psql(enrolmentId: string, txId: string) {
  // Best-effort cleanup: the claim is just test data
  try {
    const { execSync } = require("child_process");
    execSync(
      `PGPASSWORD=mtc12345 psql -h 127.0.0.1 -U mtc -d mtc_db -c "DELETE FROM manual_payment_claims WHERE \"transactionId\" = '${txId}'"`,
      { stdio: "ignore" }
    );
  } catch {
    // Non-fatal
  }
}
