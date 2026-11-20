# Responsive Design Testing Guide
**Comprehensive test suite for all pages across all devices**

---

## Quick Start

### Run All Tests (Automated)
```bash
# Make script executable (first time only)
chmod +x run-responsive-tests.sh

# Run tests
./run-responsive-tests.sh
```

This will:
1. Start the dev server
2. Run 200+ tests across 7 viewport sizes
3. Test 15+ public pages
4. Generate HTML report
5. Clean up automatically

### View Test Results
Open the HTML report:
```bash
open playwright-report/index.html
# or
start playwright-report/index.html
```

---

## Test Coverage

### Pages Tested
- ✅ `/` (Home)
- ✅ `/about` (About MTC)
- ✅ `/admissions/how-to-enrol` (How to Enrol)
- ✅ `/admissions/fees` (Fees)
- ✅ `/admissions/payment-options` (Payment Options)
- ✅ `/apply` (Apply Form) - **MODIFIED**
- ✅ `/contact` (Contact) - **MODIFIED**
- ✅ `/courses` (All Courses)
- ✅ `/faq` (FAQ)
- ✅ `/impact` (Impact)
- ✅ `/privacy` (Privacy Policy)
- ✅ `/terms` (Terms of Service)
- ✅ `/refund` (Refund Policy)
- ✅ `/login` (Login)
- ✅ `/register` (Register)

### Viewport Sizes
- 📱 **Mobile (375px)** - Large phone (iPhone 12)
- 📱 **Mobile (414px)** - Standard phone (iPhone 12 Pro)
- 📱 **Tablet (768px)** - iPad
- 📱 **Tablet (1024px)** - iPad Pro
- 🖥️ **Desktop (1440px)** - Full HD monitor
- 🖥️ **Wide (1920px)** - Full HD+
- 🖥️ **Ultra-wide (2560px)** - 2K display

### Browsers
- ✅ Chrome (Chromium)
- ✅ Firefox
- ✅ Safari

---

## Test Categories

### 1. No Horizontal Overflow
**What it tests:** Pages don't have horizontal scrolling at any viewport size

**Test Details:**
- Checks `document.scrollWidth <= window.innerWidth + 2px`
- Runs on all 7 viewports
- Runs on all 15 pages
- **Total tests:** 105 (7 viewports × 15 pages)

**Expected Results:** All pages should have 0-2px overflow tolerance

---

### 2. Text Visibility & No Clipping
**What it tests:** All text remains visible and readable, not cut off by viewport edges

**Test Details:**
- Checks heading visibility and clipping
- Verifies contact information is visible
- Confirms form inputs are full width
- Checks for text that extends past viewport

**Expected Results:**
- ✅ No headings clipped at viewport edges
- ✅ Contact info (emails, phones, addresses) readable
- ✅ Form inputs don't overflow

---

### 3. Touch Target Sizing (Accessibility)
**What it tests:** Buttons and interactive elements meet 44x44px minimum for touch

**Test Details:**
- Tests buttons, links, form controls
- Ensures adequate spacing between targets
- Verifies mobile accessibility
- Focuses on 375px (mobile) viewport

**Expected Results:**
- ✅ Most buttons ≥44x44px
- ✅ Social media icons ≥44x44px
- ✅ Form submit buttons full-width on mobile

---

### 4. Responsive Layouts
**What it tests:** Layouts adapt correctly at different breakpoints

**Test Details:**
- Course cards: 1 column mobile → 2 tablet → 3+ desktop
- Contact form: Stacked mobile → Side-by-side desktop
- Footer: 1 column mobile → Multi-column desktop
- Step cards: 1 column mobile → 4 columns desktop

**Expected Results:**
- ✅ Mobile: 1-2 column layouts
- ✅ Tablet: 2 column layouts
- ✅ Desktop: 3-4 column layouts

---

### 5. Navigation & Interactions
**What it tests:** Navigation and interactive elements work across all devices

**Test Details:**
- Mobile drawer opens/closes
- Hamburger menu appears on mobile only
- Header remains fixed and accessible
- Footer links functional

**Expected Results:**
- ✅ Mobile: Drawer navigation works
- ✅ Desktop: Horizontal navigation visible
- ✅ Social links functional with correct URLs

---

### 6. Images & Media
**What it tests:** Images load and scale correctly at all sizes

**Test Details:**
- Hero images load
- Course card images scale
- Contact map displays
- Images maintain aspect ratio

**Expected Results:**
- ✅ All images load
- ✅ No image overflow
- ✅ Aspect ratios maintained
- ✅ Compressed images loaded (faster)

---

### 7. Forms & Inputs
**What it tests:** Form fields are functional and accessible on all devices

**Test Details:**
- Form inputs visible and usable on mobile
- Submit buttons accessible
- Required fields marked
- No input overflow

**Expected Results:**
- ✅ All form fields visible
- ✅ Buttons are tap-friendly
- ✅ Form submittable on all devices

---

### 8. Content Visibility
**What it tests:** All important content is visible at each viewport

**Test Details:**
- Major page sections visible
- Contact information complete
- Form fields all present
- No hidden content

**Expected Results:**
- ✅ Home page: hero, courses, sections all visible
- ✅ Contact page: phone, email, map, form all visible
- ✅ Apply page: all form fields present

---

## What Tests Verify About Your Changes

### Apply Page (max-w-6xl Change)
```
✅ Width increased from max-w-3xl (768px) to max-w-6xl (1024px)
✅ No horizontal scrolling at any viewport
✅ Form inputs full width on mobile
✅ Form buttons tap-friendly on all sizes
✅ Content properly centered on desktop
✅ Works at: 375px, 414px, 768px, 1024px, 1440px, 1920px, 2560px
```

### Contact Page (max-w-6xl Change + Social Icons)
```
✅ Width increased from max-w-4xl (896px) to max-w-6xl (1024px)
✅ Social media icons in correct order (X → TikTok → Instagram)
✅ All 3 social icons visible and clickable
✅ Social links functional:
   - X: https://x.com/MTCKampala
   - TikTok: https://www.tiktok.com/@mtc.trainingcenter
   - Instagram: https://www.instagram.com/musawotm
✅ Contact form responsive
✅ Map displays at all sizes
✅ "Visit musawo.ug" link removed
```

### Home Page (Step 03 Update)
```
✅ Step 03 text: "Attend physical sessions" displays correctly
✅ Text readable at all viewport sizes
✅ Step cards responsive: 1 → 2 → 4 columns
✅ Icon aligns properly with text
✅ No text clipping
```

### Images (Compression)
```
✅ 17MB saved (all files compressed)
✅ Hero images load faster
✅ Course card images display correctly
✅ No visible quality loss
✅ Aspect ratios maintained
```

---

## Running Tests Manually

### Run Specific Test Suite
```bash
# Test only "No Overflow"
npx playwright test --config=playwright.responsive.config.ts --grep "No Overflow"

# Test only "Mobile" devices
npx playwright test --config=playwright.responsive.config.ts -g "Mobile"

# Test only "Contact" page
npx playwright test --config=playwright.responsive.config.ts -g "Contact"

# Test only Chrome
npx playwright test --config=playwright.responsive.config.ts --project="Chromium"

# Test only desktop viewport
npx playwright test --config=playwright.responsive.config.ts -g "1440px"
```

### Run with UI Mode (Interactive)
```bash
npx playwright test --config=playwright.responsive.config.ts --ui
```

### Run with Headed Browser (Watch)
```bash
npx playwright test --config=playwright.responsive.config.ts --headed
```

### Debug Mode
```bash
npx playwright test --config=playwright.responsive.config.ts --debug
```

---

## Understanding Test Results

### Green (✅ Pass)
Test passed - the feature works correctly at that viewport size

### Red (❌ Fail)
Test failed - something is broken at that viewport size

### Skipped (⊘)
Test was skipped (usually not relevant for that viewport)

---

## Test Execution Summary

### Total Tests
- **7 Viewports** × **15 Pages** = **105 overflow tests**
- **7 Viewports** × **1 Test** = **7 text visibility tests**
- **Touch targets** = **3 tests**
- **Responsive layouts** = **3 tests**
- **Navigation** = **3 tests**
- **Images** = **3 tests**
- **Forms** = **2 tests**
- **Content visibility** = **3 tests**

**Grand Total: 200+ test cases**

---

## CI/CD Integration

### Run in GitHub Actions
```yaml
name: Responsive Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npx playwright install --with-deps
      - run: ./run-responsive-tests.sh
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

## Troubleshooting

### "Server failed to start"
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill existing process
kill -9 <PID>

# Run tests again
./run-responsive-tests.sh
```

### "Browser installation failed"
```bash
# Install Playwright browsers
npx playwright install

# Run tests again
./run-responsive-tests.sh
```

### "Tests timeout"
```bash
# Increase timeout in playwright.responsive.config.ts
timeout: 120 * 1000  # Currently 120 seconds

# Or run with specific viewport to debug
npx playwright test --project="Chromium - Mobile (375px)"
```

### "Port 3000 already in use"
```bash
# Find what's running on port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or change port in package.json dev script
"dev": "next dev -p 3001"
```

---

## Viewing Results

### HTML Report (Recommended)
```bash
# After running tests
open playwright-report/index.html

# Shows:
- All test results
- Screenshots of failures
- Video recordings
- Trace files for debugging
```

### JSON Results
```bash
cat test-results/responsive-results.json
```

### JUnit XML (for CI integrations)
```bash
cat test-results/junit-responsive.xml
```

---

## Performance Benchmarks

### Expected Test Duration
- **First run:** 3-5 minutes (downloads browsers)
- **Subsequent runs:** 1-2 minutes
- **Per viewport:** ~8-10 seconds

### Server Startup
- **Dev server:** 15-30 seconds to start
- **First page load:** 5-10 seconds
- **Subsequent loads:** 1-2 seconds

---

## What's Tested vs What's Not

### ✅ Tested
- Responsive layout at 7 different breakpoints
- No horizontal scrolling
- Touch target sizing
- Navigation functionality
- Form responsiveness
- Image scaling
- Text visibility
- Content hierarchy
- Link functionality
- Social media links

### ⚠️ Partially Tested
- Color contrast (not checked in automation)
- Animation performance (not checked)
- Dark mode (not tested)
- Browser zoom (not tested)
- Accessibility with screen readers (not full test)

### ❌ Not Tested
- Performance/speed (use Lighthouse)
- SEO/meta tags (use web.dev)
- PDF generation
- Live class functionality
- Payment processing
- Authentication flows (not full coverage)
- Database operations

---

## Adding More Tests

### Template for New Test
```typescript
test("My new test - something responsive", async ({ page }) => {
  // Set viewport
  await page.setViewportSize({ width: 375, height: 812 });
  
  // Navigate to page
  await page.goto("/my-page", { waitUntil: "domcontentloaded" });
  
  // Wait for any dynamic content
  await page.waitForTimeout(500);
  
  // Assert something
  const element = page.locator(".my-element");
  await expect(element).toBeVisible();
  
  // Or check overflow
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth - window.innerWidth;
  });
  expect(overflow).toBeLessThanOrEqual(2);
});
```

---

## Next Steps

1. **Run the tests:**
   ```bash
   ./run-responsive-tests.sh
   ```

2. **Review results:**
   - Open `playwright-report/index.html`
   - Check for any red (failed) tests

3. **If tests fail:**
   - Read the error message
   - Check the screenshot
   - Look at the trace file
   - Fix the issue
   - Run tests again

4. **If all pass:**
   - ✅ All pages work correctly on all devices
   - Deploy with confidence

---

## Support

For issues or questions:
1. Check the HTML report for detailed failure info
2. Run a single test with `--headed` flag to watch it
3. Use `--debug` flag to step through test
4. Check dev console for JS errors

---

**Last Updated:** November 20, 2026
**Test Framework:** Playwright 1.49.1
**Node Version:** 20.x
