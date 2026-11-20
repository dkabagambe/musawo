# Manual Responsive Testing Guide
**Test all devices and viewport sizes**

---

## Quick Test Checklist

### Using Chrome DevTools
1. Open DevTools: `F12` or `Cmd+Option+I`
2. Click device icon (top-left): ![toggle device toolbar]
3. Test each size below

---

## Test Scenarios by Viewport

### 📱 Mobile Portrait (320px - iPhone SE/11/12/13 Mini)
**Hero/Slider Section:**
- [ ] Slider fills entire viewport (100vh)
- [ ] Text overlay readable (no cut-off)
- [ ] "Apply now" button tappable (44px+ height)
- [ ] No horizontal scrollbar

**Course Cards (Home Page):**
- [ ] Single column layout
- [ ] Card image visible (h-52)
- [ ] Price/fee text visible: "UGX 1,800,000"
- [ ] International fee **ONLY on first card** "Intl: USD 638"
- [ ] Other 7 cards: NO international fee shown
- [ ] Apply button not cut off

**Course Cards (Courses Page):**
- [ ] Single column
- [ ] Duration badge visible (top-right)
- [ ] Category badge visible (top-left)
- [ ] "Intl: USD 638" appears ONLY on Medical Home Care
- [ ] All other 7 courses: UGX ONLY

**Page Heroes (Courses, Contact, Privacy, Terms):**
- [ ] Height: minimum 400px (visible on very small screens)
- [ ] Image visible and not stretched
- [ ] Title readable (max 2-3 lines)
- [ ] Breadcrumb visible
- [ ] No text overflow at edges

**Navigation:**
- [ ] Logo visible
- [ ] Hamburger menu icon visible
- [ ] Menu items collapse into drawer
- [ ] Contact link in menu

**Footer:**
- [ ] Single column layout
- [ ] Links stacked vertically
- [ ] Social icons visible
- [ ] No horizontal scroll

---

### 📱 Mobile Landscape (414px - iPhone X/12/13 in landscape)
**Hero/Slider:**
- [ ] Still visible (shouldn't require scroll to see)
- [ ] Text readable
- [ ] Height still responsive (100vh)

**Course Cards:**
- [ ] Still single or double column depending on width
- [ ] Cards not cramped
- [ ] Images visible

---

### 📱 Mobile (375px - iPhone 12/13/14/15)
**Repeat all "Mobile Portrait" checks**
- [ ] Extra breathing room vs 320px
- [ ] Text larger and more readable
- [ ] All elements properly spaced

---

### 📱 Mobile Large (414px - iPhone 11/12 Pro Max)
**Standard mobile portrait checks:**
- [ ] Cards still single column (not jumping to 2)
- [ ] Plenty of breathing room

---

### 📱 Tablet Portrait (768px - iPad Mini/Air)
**Navigation:**
- [ ] Horizontal navigation visible (not hamburger menu)
- [ ] All menu items visible: Home, About, Admissions, Impact, Courses, Contact, Apply
- [ ] Contact link visible in navbar

**Hero/Slider:**
- [ ] Full height maintained
- [ ] Image and text balanced

**Course Cards (Home):**
- [ ] **2 columns** (md:grid-cols-2)
- [ ] Cards have good spacing
- [ ] Images clear

**Page Heroes:**
- [ ] Height: 80vh (≈ 614px at 768px viewport)
- [ ] Image visible with content overlay on left or right
- [ ] Title and description visible

**Course Cards (Courses Page):**
- [ ] **2 columns**
- [ ] Fee information visible for all courses
- [ ] "Intl: USD 638" only on first card
- [ ] Other cards: UGX only, no international fee

---

### 📱 Tablet Landscape (1024px - iPad Pro)
**Navigation:**
- [ ] Full desktop-style horizontal menu
- [ ] Sidebar visible if applicable

**Course Cards:**
- [ ] **3 columns** (lg:grid-cols-3)
- [ ] Generous spacing
- [ ] All 8 courses visible at once
- [ ] Images properly loaded

**Page Heroes:**
- [ ] Height: 80vh (≈ 819px)
- [ ] More generous image visibility
- [ ] Sidebar navigation visible (for admin pages)

---

### 🖥️ Desktop (1440px - Full HD / MacBook 13")
**All Elements:**
- [ ] Navigation fully expanded
- [ ] Course cards: 3 columns
- [ ] Page heroes: 80vh height
- [ ] All content centered in max-width container (1200px)
- [ ] Balanced left/right spacing

**Specific Tests:**
- [ ] Hero images not stretched
- [ ] Text hierarchy clear
- [ ] All 8 courses visible without scroll
- [ ] Fees displayed correctly:
  - Medical Home Care: "International: USD 638"
  - All others: No international fee

---

### 🖥️ Desktop Wide (1920px - Full HD+ / iMac)
**Typography:**
- [ ] Headers larger (up to 2.75rem)
- [ ] Body text larger
- [ ] Spacing increased

**Grids:**
- [ ] Course cards: **4 columns** (3xl:grid-cols-4)
- [ ] All 8 courses visible easily
- [ ] Generous gutters

**Page Heroes:**
- [ ] Still 80vh (capped at reasonable height)
- [ ] Image quality high
- [ ] Content overlay readable

---

### 🖥️ Ultra-Wide (2560px - 2K / Presentation Display)
**Typography:**
- [ ] Headers even larger
- [ ] Body text scaled for distance viewing
- [ ] All text readable from distance

**Grids:**
- [ ] Course cards: Still 4 columns
- [ ] More spacing between cards
- [ ] Content container max-width: 1800px

**Page Heroes:**
- [ ] 80vh maintained (capped at 700px max)
- [ ] Not stretched too tall
- [ ] Image quality maintained

---

### 🖥️ 4K (3840px - Ultra-wide / Theater Display)
**Scaling:**
- [ ] All text proportionally scaled
- [ ] Content still readable from distance
- [ ] No element extends edge-to-edge
- [ ] Max-width container still constrains to 1800px

---

## Critical Tests for This Session

### ✅ Course Images
**Home Page (Hero/Slider):**
- [ ] Slider images are professional training photos (hero-*.jpg)
- [ ] Not old placeholder images
- [ ] Images load quickly
- [ ] Ken Burns zoom effect works smoothly

**Home Course Cards:**
- [ ] All 8 cards show new professional images (not old)
- [ ] Medical Home Care: hero-medical-home-care-1.jpg ✓
- [ ] Basic Home Care: hero-basic-home-care-1.jpg ✓
- [ ] Babysitting & Childcare: hero-childcare-1.jpg ✓
- [ ] Mental Health: hero-mental-health-1.jpg ✓
- [ ] Care of Older Persons: hero-geriatric-care-1.jpg ✓
- [ ] Basic Life Support: hero-life-support-1.jpg ✓
- [ ] Advanced Life Support: hero-life-support-2.jpg ✓
- [ ] First Aid: hero-first-aid-1.jpg ✓

**Courses Page Cards:**
- [ ] Same 8 images display correctly
- [ ] Images have cache-busting (?v=2) applied
- [ ] Images not cached from old version

---

### ✅ International Fees
**Home Page Course Cards:**
- [ ] Medical Home Care (Card 1): Shows "International: USD 638" ✓
- [ ] Basic Home Care (Card 2): NO international fee, UGX only ✓
- [ ] Babysitting & Childcare (Card 3): NO international fee, UGX only ✓
- [ ] Mental Health (Card 4): NO international fee, UGX only ✓
- [ ] Care of Older Persons (Card 5): NO international fee, UGX only ✓
- [ ] Basic Life Support (Card 6): NO international fee, UGX only ✓
- [ ] Advanced Life Support (Card 7): NO international fee, UGX only ✓
- [ ] First Aid (Card 8): NO international fee, UGX only ✓

**Courses Page Cards:**
- [ ] Repeat same checks
- [ ] Filter by "Professionals" — still shows correctly
- [ ] Filter by "Open to all" — still shows correctly

---

### ✅ Hero Heights
**Home Hero (Slider):**
- [ ] Mobile: Full viewport (100vh)
- [ ] Tablet: Full viewport (100vh)
- [ ] Desktop: Full viewport (100vh)
- [ ] Ultra-wide: Full viewport (100vh)

**Page Heroes (Courses, Contact, Privacy, Terms, etc.):**
- [ ] Mobile (320px): Minimum 400px ✓
- [ ] Mobile (414px): 400px+ ✓
- [ ] Tablet (768px): ~614px (80vh) ✓
- [ ] Desktop (1024px): ~819px (80vh) ✓
- [ ] Wide (1440px): ~1152px (80vh) ✓
- [ ] Ultra-wide (2560px): Capped at 700px max ✓

---

## Browser Compatibility

### Desktop Browsers
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)

### Mobile Browsers
- [ ] Safari iOS (iPhone)
- [ ] Chrome iOS
- [ ] Samsung Internet
- [ ] Firefox Android

### Specific Device Tests (Recommended)
- [ ] iPhone SE (small)
- [ ] iPhone 14 (standard)
- [ ] iPhone 14 Pro Max (large)
- [ ] iPad Air (tablet)
- [ ] iPad Pro (large tablet)
- [ ] Android phone (Samsung S23 or similar)
- [ ] Android tablet (Samsung Tab or similar)

---

## Performance Notes

### Image Loading
- [ ] No blinking/flashing on page load
- [ ] Blur placeholder visible briefly
- [ ] Images load progressively
- [ ] LCP (Largest Contentful Paint) < 2.5s on 3G

### Scrolling
- [ ] Smooth scrolling on all devices
- [ ] No jank on slider rotation
- [ ] No layout shift when images load (CLS < 0.1)

### Touch
- [ ] Buttons respond immediately (< 100ms)
- [ ] No double-tap to zoom needed
- [ ] Smooth tap feedback

---

## Accessibility Checks

### Mobile
- [ ] Text is readable without zoom (16px+ minimum)
- [ ] Buttons are tappable (44px× 44px minimum)
- [ ] Links have sufficient spacing
- [ ] Form inputs have labels

### All Devices
- [ ] Focus indicators visible on keyboard navigation
- [ ] Color contrast WCAG AA (4.5:1 for text)
- [ ] Alt text on images
- [ ] Semantic HTML (heading hierarchy)

---

## Documentation & Notes

### Where to Test
1. **Local:** `localhost:3000` (dev server)
2. **Production:** `https://musawo.render.com` or your live URL

### How to Report Issues
If you find a device where something breaks:
1. Note the exact viewport size (e.g., 375px × 667px)
2. Note the page (e.g., /courses)
3. Note what's broken (e.g., "course card image missing")
4. Take a screenshot
5. Open an issue with: Device, Browser, Viewport, Issue

### Example Issue Format
```
Device: iPhone 12
Browser: Safari
Viewport: 390px × 844px
Page: /courses
Issue: Course card price text overflows to next line
Screenshot: [paste screenshot]
```

---

## Sign-Off
- [ ] All mobile tests (320-414px) passed
- [ ] All tablet tests (768-1024px) passed
- [ ] All desktop tests (1440-1920px) passed
- [ ] All ultra-wide tests (2560px) passed
- [ ] Course images correct on all devices
- [ ] International fees correct (Medical Home Care only)
- [ ] Hero heights correct on all devices
- [ ] No horizontal overflow on any device
- [ ] All browsers tested

**Tested By:** ________________  
**Date:** ________________  
**Notes:** ________________________________________________________________
