/**
 * 2FA end-to-end test.
 *
 * Run with: APP_ENV=staging TOTP_REQUIRED=true npm start
 * then:   npx playwright test e2e/two-factor.spec.ts
 *
 * Tests:
 *   1. Setup: Principal is redirected to /2fa-setup, completes setup with a
 *      generated TOTP code, sees 10 backup codes.
 *   2. Login with a TOTP code after setup (TOTP_REQUIRED error triggers TOTP step).
 *   3. Login with a backup code (used once only, second attempt fails).
 *   4. Director resets the Principal's 2FA from the staff page.
 */

import { test, expect, type Page } from "@playwright/test";

const BASE = "http://localhost:3000";
const PRINCIPAL_EMAIL = "principal@mtc.ac.ug";
const PRINCIPAL_PASSWORD = "Demo1234!";
const DIRECTOR_EMAIL = "director@mtc.ac.ug";
const DIRECTOR_PASSWORD = "Demo1234!";

async function signIn(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="identifier"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
}

/** Wait for and fill the TOTP step (shown after TOTP_REQUIRED error). */
async function fillTotpStep(page: Page, code: string) {
  // The TOTP step shows a single input for the 6-digit code
  await page.waitForSelector('input[name="totpCode"]', { timeout: 10000 });
  await page.fill('input[name="totpCode"]', code);
  await page.click('button[type="submit"]');
}

/** Generate a TOTP code from a base32 secret using the otpauth library. */
async function generateTotpCode(secret: string): Promise<string> {
  const { TOTP, Secret } = await import("otpauth");
  const totp = new TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
  return totp.generate();
}

// Shared state across tests (Playwright runs tests in order within a file)
let totpSecret = "";
let backupCodes: string[] = [];

test.describe("2FA end-to-end", () => {
  test.setTimeout(120_000);

  // Clean up: disable 2FA on the principal before and after tests
  test.beforeAll(async () => {
    const { execSync } = await import("child_process");
    try {
      execSync(`npm run reset-2fa -- ${PRINCIPAL_EMAIL}`, {
        cwd: process.cwd(),
        stdio: "pipe",
        timeout: 15000,
      });
    } catch {
      // 2FA might not be enabled; that is fine
    }
  });

  test.afterAll(async () => {
    const { execSync } = await import("child_process");
    try {
      execSync(`npm run reset-2fa -- ${PRINCIPAL_EMAIL}`, {
        cwd: process.cwd(),
        stdio: "pipe",
        timeout: 15000,
      });
    } catch {
      // ignore
    }
  });

  test("1. Principal completes 2FA setup and sees 10 backup codes", async ({ page }) => {
    // Sign in as Principal (TOTP_REQUIRED=true should redirect to /2fa-setup)
    await signIn(page, PRINCIPAL_EMAIL, PRINCIPAL_PASSWORD);

    // Should be redirected to 2fa-setup
    await page.waitForURL(/\/2fa-setup/, { timeout: 15000 });
    expect(page.url()).toContain("/2fa-setup");

    // Fetch the TOTP secret from the API
    const setupRes = await page.evaluate(async () => {
      const r = await fetch("/api/auth/totp/setup");
      return r.json() as Promise<{ secret?: string; error?: string }>;
    });
    expect(setupRes.secret).toBeTruthy();
    totpSecret = setupRes.secret!;

    // Generate a valid 6-digit TOTP code
    const code = await generateTotpCode(totpSecret);
    expect(code).toHaveLength(6);

    // Enter the code digit by digit (6 single-char inputs)
    const inputs = page.locator('input[maxlength="1"]');
    await expect(inputs.first()).toBeVisible({ timeout: 10000 });
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThanOrEqual(6);

    for (let i = 0; i < 6; i++) {
      await inputs.nth(i).fill(code[i]);
    }

    // Submit (the form auto-submits when all digits are filled, or click the button)
    const submitBtn = page.locator('button[type="submit"]');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }

    // Wait for the "2FA enabled" success page
    await expect(page.locator("text=2FA enabled")).toBeVisible({ timeout: 15000 });

    // Verify 10 backup codes are shown
    const backupCodeElements = page.locator("code.font-mono");
    await expect(backupCodeElements.first()).toBeVisible({ timeout: 5000 });
    const backupCount = await backupCodeElements.count();
    expect(backupCount).toBe(10);

    // Save backup codes for later tests
    for (let i = 0; i < backupCount; i++) {
      const text = await backupCodeElements.nth(i).textContent();
      if (text) backupCodes.push(text.trim());
    }
    expect(backupCodes.length).toBe(10);
    expect(backupCodes[0].length).toBe(8);
  });

  test("2. Principal logs in with a TOTP code", async ({ page }) => {
    await page.context().clearCookies();

    // Sign in with email + password first (triggers TOTP_REQUIRED)
    await signIn(page, PRINCIPAL_EMAIL, PRINCIPAL_PASSWORD);

    // Should show the TOTP step
    await page.waitForSelector('input[name="totpCode"]', { timeout: 10000 });

    // Generate a fresh TOTP code (time may have moved)
    const code = await generateTotpCode(totpSecret);
    await fillTotpStep(page, code);

    // Should land on the Principal portal
    await page.waitForURL(/\/principal/, { timeout: 15000 });
    expect(page.url()).toContain("/principal");
  });

  test("3. Principal logs in with a backup code (used once only)", async ({ page }) => {
    await page.context().clearCookies();

    // Sign in with email + password first (triggers TOTP_REQUIRED)
    await signIn(page, PRINCIPAL_EMAIL, PRINCIPAL_PASSWORD);

    // Should show the TOTP step
    await page.waitForSelector('input[name="totpCode"]', { timeout: 10000 });

    // Use a backup code (8 chars)
    const backupCode = backupCodes[0];
    expect(backupCode).toBeTruthy();
    await fillTotpStep(page, backupCode);

    // Should land on the Principal portal
    await page.waitForURL(/\/principal/, { timeout: 15000 });
    expect(page.url()).toContain("/principal");

    // Now try to use the same backup code again (should fail)
    await page.context().clearCookies();
    await signIn(page, PRINCIPAL_EMAIL, PRINCIPAL_PASSWORD);
    await page.waitForSelector('input[name="totpCode"]', { timeout: 10000 });
    await fillTotpStep(page, backupCode);

    // Should NOT land on the Principal portal (backup code is single-use)
    await page.waitForTimeout(3000);
    expect(page.url()).not.toMatch(/\/principal/);
  });

  test("4. Director resets Principal's 2FA from the staff page", async ({ page }) => {
    // Sign in as Director (no 2FA on Director in staging without TOTP_REQUIRED)
    await page.context().clearCookies();
    await signIn(page, DIRECTOR_EMAIL, DIRECTOR_PASSWORD);

    // Director should land on /director
    await page.waitForURL(/\/director/, { timeout: 15000 });

    // Go to the staff page
    await page.goto(`${BASE}/director/staff`);
    await expect(page.locator("text=Staff Accounts")).toBeVisible({ timeout: 10000 });

    // Find the Principal row and click "Reset 2FA"
    const principalRow = page.locator("tr", { hasText: "Principal" });
    await expect(principalRow).toBeVisible();

    const resetButton = principalRow.locator("text=Reset 2FA");
    await expect(resetButton).toBeVisible();

    // Accept the confirmation dialog
    page.on("dialog", (dialog) => dialog.accept());
    await resetButton.click();

    // Wait for success message
    await expect(page.locator("text=reset")).toBeVisible({ timeout: 10000 });

    // Verify: Principal can now log in without 2FA (goes straight to portal)
    await page.context().clearCookies();
    await signIn(page, PRINCIPAL_EMAIL, PRINCIPAL_PASSWORD);
    await page.waitForURL(/\/principal/, { timeout: 15000 });
    expect(page.url()).toContain("/principal");
  });
});
