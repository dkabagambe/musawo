import { test, expect, request as apiRequest } from "@playwright/test";

// S5: Examinations, My Results, Certificates
// Tests cover: locked exams by payment phase, published-only results with
// comments, certificate PDF download and verification, forward-only exam
// enforcement via the API.

const STUDENT_COMPLETED = "student.completed@example.com";
const STUDENT_NEW = "student.new@example.com";
const PASSWORD = "Demo1234!";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  // The login form uses controlled inputs with type selectors, not name attributes
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard", { timeout: 15000 });
}

test.describe("Student S5: Examinations, Results, Certificates", () => {
  test.describe("Examinations", () => {
    test("new student sees locked exams with payment reason", async ({ page }) => {
      await login(page, STUDENT_NEW);
      await page.goto("/dashboard/exams");

      // Should see exam listings (not the empty "No exams" state)
      const lockedReason = page.locator("text=/Pay 50% to start/");
      const count = await lockedReason.count();
      expect(count).toBeGreaterThan(0);
    });

    test("completed student sees exam results status", async ({ page }) => {
      await login(page, STUDENT_COMPLETED);
      await page.goto("/dashboard/exams");

      // Should see exams page with at least one exam
      await expect(page.locator("#main-content h1")).toContainText("Examinations");
      // The completed student passed both exams - should see "View result" links
      const viewResultLinks = page.locator('a[href*="/dashboard/results"]');
      const count = await viewResultLinks.count();
      expect(count).toBeGreaterThan(0);
    });

    test("exam detail shows locked screen for unpaid student", async ({ page }) => {
      await login(page, STUDENT_NEW);
      // Navigate to exams to find an exam ID
      await page.goto("/dashboard/exams");
      const examLink = page.locator('a[href^="/dashboard/exams/"]').first();
      const hasExamLink = (await examLink.count()) > 0;
      if (hasExamLink) {
        await examLink.click();
        await page.waitForLoadState("networkidle");
        // Should see locked message, not the exam itself
        const lockedText = page.locator("text=/Exam locked|Pay/");
        expect(await lockedText.count()).toBeGreaterThan(0);
      }
    });
  });

  test.describe("My Results", () => {
    test("completed student sees published results with comments and letter grade", async ({ page }) => {
      await login(page, STUDENT_COMPLETED);
      await page.goto("/dashboard/results");

      await expect(page.locator("#main-content h1")).toContainText("My Results");

      // Should see Pass status
      const passBadges = page.locator("text=Pass");
      expect(await passBadges.count()).toBeGreaterThan(0);

      // Should see tutor comments
      const comments = page.locator("text=/Strong performance|Well done/");
      expect(await comments.count()).toBeGreaterThan(0);

      // Should see letter grade chips (A, B, C, D)
      const letterGrades = page.locator("text=/^A$|^B$|^C$|^D$|F/");
      const gradeCount = await letterGrades.count();
      expect(gradeCount).toBeGreaterThan(0);

      // Print results statement link
      await expect(page.locator('a[href="/api/results/statement"]')).toBeVisible();
    });

    test("results statement PDF downloads", async ({ page }) => {
      await login(page, STUDENT_COMPLETED);
      await page.goto("/dashboard/results");

      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.locator('a[href="/api/results/statement"]').click(),
      ]);

      const filename = download.suggestedFilename();
      expect(filename).toContain("results-statement");
      expect(filename).toMatch(/\.pdf$/);
    });
  });

  test.describe("Certificates", () => {
    test("completed student sees certificate with download and verify links", async ({ page }) => {
      await login(page, STUDENT_COMPLETED);
      await page.goto("/dashboard/certificates");

      await expect(page.locator("#main-content h1")).toContainText("My Certificates");

      // Should see Download PDF button
      const downloadBtn = page.locator("a:has-text('Download PDF')");
      expect(await downloadBtn.count()).toBeGreaterThan(0);

      // Should see Verify certificate link
      const verifyLink = page.locator("a:has-text('Verify certificate')");
      expect(await verifyLink.count()).toBeGreaterThan(0);

      // Should see QR code image
      const qrImg = page.locator('img[alt*="QR"]');
      expect(await qrImg.count()).toBeGreaterThan(0);
    });

    test("new student sees eligibility checklist, not a certificate", async ({ page }) => {
      await login(page, STUDENT_NEW);
      await page.goto("/dashboard/certificates");

      // Should see eligibility section
      const eligibilitySection = page.locator("text=Certificate Eligibility");
      const checklistText = page.locator("text=Not yet eligible");
      const checkCount = await checklistText.count();
      expect(checkCount).toBeGreaterThan(0);

      // Should NOT see Download PDF (no certificate issued yet)
      const downloadBtn = page.locator("a:has-text('Download PDF')");
      expect(await downloadBtn.count()).toBe(0);
    });
  });

  test.describe("Certificate Verification (public)", () => {
    test("verify page loads and shows certificate details", async ({ page }) => {
      // The verify page is public - no login needed
      await page.goto("/verify/MTC-2026-CERT-00001");
      await page.waitForLoadState("networkidle");

      // Should show certificate verification page
      const certText = page.locator("text=/Certificate|certificate/i");
      expect(await certText.count()).toBeGreaterThan(0);
    });
  });

  test.describe("Forward-only exam enforcement (API)", () => {
    test("server rejects answers to earlier questions", async ({ browser }) => {
      // Use a test student who can take exams. Use t05 to avoid colliding
      // with other tests that use t01.
      const page = await browser.newPage();
      await login(page, "student.t05@example.com");
      await page.goto("/dashboard/exams");

      // Find an exam that can be started
      const startLink = page.locator('a:has-text("Start exam")').first();
      const hasStartableExam = (await startLink.count()) > 0;
      if (!hasStartableExam) {
        test.skip();
        return;
      }

      // Get the exam page
      await startLink.click();
      await page.waitForLoadState("networkidle");

      // Start the exam via the API
      const pageUrl = page.url();
      const examId = pageUrl.split("/").pop() || "";

      // Get session cookies
      const cookies = await page.context().cookies();
      const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

      const apiContext = await apiRequest.newContext({
        extraHTTPHeaders: { Cookie: cookieStr },
      });

      // Start the exam
      const startRes = await apiContext.post(
        `http://localhost:3000/api/exams?action=start`,
        { data: { examId } }
      );
      expect(startRes.ok()).toBeTruthy();
      const startData = await startRes.json();

      if (!startData.attemptId || !startData.questions || startData.questions.length < 2) {
        test.skip();
        return;
      }

      const attemptId = startData.attemptId;
      const q0 = startData.questions[0];
      const q1 = startData.questions[1];

      // Answer question 0 (advance forward)
      const answerRes = await apiContext.post(
        `http://localhost:3000/api/exams?action=answer`,
        { data: { attemptId, questionId: q0.id, answer: "test", index: 0 } }
      );
      expect(answerRes.ok()).toBeTruthy();

      // Try to go BACK to question 0 - should be rejected
      const backRes = await apiContext.post(
        `http://localhost:3000/api/exams?action=answer`,
        { data: { attemptId, questionId: q0.id, answer: "changed", index: 0 } }
      );
      expect(backRes.ok()).toBeFalsy();
      const backData = await backRes.json();
      expect(backData.error).toContain("closed");

      // Clean up: delete the attempt so the test is repeatable
      await apiContext.post(`http://localhost:3000/api/exams?action=submit`, {
        data: { attemptId },
      });

      await apiContext.dispose();
      await page.close();
    });
  });
});
