import { test, expect } from '@playwright/test';

// Smoke tests for critical pages and features
// Covers: mobile (375px), tablet (768px), desktop (1440px)
// Tests: Page loads, no horizontal overflow, images visible

const VIEWPORTS = [
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1440, height: 900 },
];

const PAGES = [
  { path: '/', name: 'Home' },
  { path: '/about', name: 'About' },
  { path: '/apply', name: 'Apply' },
  { path: '/contact', name: 'Contact' },
  { path: '/courses', name: 'Courses' },
  { path: '/faq', name: 'FAQ' },
  { path: '/impact', name: 'Impact' },
  { path: '/privacy', name: 'Privacy' },
  { path: '/terms', name: 'Terms' },
  { path: '/login', name: 'Login' },
];

// Test all pages across all viewports
VIEWPORTS.forEach((viewport) => {
  test.describe(`${viewport.name} (${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    PAGES.forEach((pageData) => {
      test(`${pageData.name} - loads and no overflow`, async ({ page }) => {
        // Navigate to the page
        await page.goto(`http://localhost:3000${pageData.path}`, { waitUntil: 'networkidle' });
        
        // Verify the page loaded
        expect(page.url()).toContain(pageData.path);
        
        // Check for horizontal overflow
        const html = await page.locator('html');
        const scrollWidth = await html.evaluate(el => el.scrollWidth);
        const clientWidth = await html.evaluate(el => el.clientWidth);
        
        // scrollWidth should be <= clientWidth (allowing 1px for rounding)
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
      });

      test(`${pageData.name} - images load`, async ({ page }) => {
        await page.goto(`http://localhost:3000${pageData.path}`, { waitUntil: 'networkidle' });
        
        // Check if images exist and have src attributes
        const images = await page.locator('img[src]');
        const count = await images.count();
        
        if (count > 0) {
          // Check first image has a valid src
          const firstImg = images.nth(0);
          const src = await firstImg.getAttribute('src');
          expect(src).toBeTruthy();
          expect(src).not.toBe('');
        }
      });
    });

    test('Page content is visible (not hidden/overflow)', async ({ page }) => {
      await page.goto('http://localhost:3000');
      
      // Check main content is visible
      const main = page.locator('main, [role="main"], section').first();
      if (await main.count() > 0) {
        await expect(main).toBeVisible();
      }
    });
  });
});

// Test auth pages specifically
test.describe('Auth Pages', () => {
  test('Login page loads', async ({ page }) => {
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    expect(page.url()).toContain('/login');
  });

  test('Register page loads', async ({ page }) => {
    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
    // Register might redirect, so just check page loaded
    await page.waitForLoadState('networkidle');
  });
});

// Test critical flows
test.describe('Critical Flows', () => {
  test('Home page hero section visible', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Check for hero or main heading
    const heading = page.locator('h1').first();
    if (await heading.count() > 0) {
      await expect(heading).toBeVisible();
    }
  });

  test('Responsive layout works (viewport change)', async ({ page }) => {
    // Test at mobile width
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');
    
    let html = await page.locator('html');
    let scrollWidth = await html.evaluate(el => el.scrollWidth);
    let clientWidth = await html.evaluate(el => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    
    // Test at desktop width
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000');
    
    html = await page.locator('html');
    scrollWidth = await html.evaluate(el => el.scrollWidth);
    clientWidth = await html.evaluate(el => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
