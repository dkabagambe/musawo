import { defineConfig, devices } from "@playwright/test";

/**
 * Comprehensive Responsive Testing Configuration
 * Tests desktop, tablet, and mobile viewports
 */
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*responsive*.spec.ts",
  
  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ["html"],
    ["json", { outputFile: "test-results/responsive-results.json" }],
    ["junit", { outputFile: "test-results/junit-responsive.xml" }],
    ["list"],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: "http://localhost:3000",

    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",

    /* Take screenshot on failure */
    screenshot: "only-on-failure",

    /* Video on failure */
    video: "retain-on-failure",
  },

  /* Configure projects for major browsers + multiple viewport sizes */
  projects: [
    {
      name: "Chromium - Mobile (375px)",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 375, height: 812 },
      },
    },
    {
      name: "Chromium - Mobile (414px)",
      use: {
        ...devices["iPhone 12"],
        viewport: { width: 414, height: 896 },
      },
    },
    {
      name: "Chromium - Tablet (768px)",
      use: {
        ...devices["iPad"],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "Chromium - Tablet Pro (1024px)",
      use: {
        ...devices["iPad Pro"],
        viewport: { width: 1024, height: 1366 },
      },
    },
    {
      name: "Chromium - Desktop (1440px)",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "Chromium - Wide (1920px)",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: "Chromium - Ultra-wide (2560px)",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 2560, height: 1440 },
      },
    },

    {
      name: "Firefox - Desktop (1440px)",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1440, height: 900 },
      },
    },

    {
      name: "Safari - Desktop (1440px)",
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
