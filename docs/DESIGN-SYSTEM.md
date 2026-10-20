## 9. Portal consistency

Authenticated staff and student pages use the shared `AppShell` from `src/components/ui/AppShell.tsx`. Dashboard structure and card anatomy come from `DashboardWidgets.tsx`; roles supply permission-filtered navigation and role-scoped data to those shared components.

Portal dashboard tokens:

| Token                | Value                                 | Usage                                |
| -------------------- | ------------------------------------- | ------------------------------------ |
| Token                | Value                                 | Usage                                |
| -------              | -------                               | -------                              |
| UI font              | Inter, 400/500/600                    | Portal content, rows, and controls   |
| Display font         | Plus Jakarta Sans, 600                | Greeting and page titles             |
| Greeting             | 28/36 px, 600                         | Dashboard greeting                   |
| Widget title         | 16/24 px, 600                         | Shared widget header                 |
| Card title           | 14/20 px, 600                         | Mini and profile cards               |
| Body                 | 14/20 px, 400                         | List rows and primary copy           |
| Meta                 | 13/18 px, #5B6770                     | Dates, numbers, and secondary copy   |
| Content padding      | 24 px desktop, 16 px phone            | Shared content edge                  |
| Widget padding       | 20 px                                 | Tinted widget panel                  |
| Widget gap           | 20 px vertical, 24 px between columns | Dashboard rhythm                     |
| Card padding         | 16 px, 12 px between cards            | White inner cards                    |
| Widget background    | #E3EDEA                               | Widget panel                         |
| Widget inner surface | #FFFFFF                               | Rows, mini cards, profile cards      |
| Widget inner border  | #D9E3E0                               | Inner item boundary                  |
| Text                 | #1F2937                               | Titles and primary labels            |
| Teal                 | #0B6B5D                               | Links, active tabs, actionable icons |

The shared dashboard uses a single greeting, URL-backed tabs, and balanced masonry columns. Saved column choices stay pinned. Tablet uses a 72 px icon rail and two widget columns; phones use a single widget column. Shared widgets enter with a short fade and lift, disabled when reduced motion is requested. Sidebar navigation is filtered by RBAC permissions.

# Musawo Training Center - Design System

Version 1.0 - October 2026

---

## 1. Container and layout

- Max container width: 1200 px (`max-w-[1200px] mx-auto`)
- Side padding: 24 px desktop (`px-6`), 16 px mobile (`px-4`)
- All left content edges align at the same container boundary.

### Spacing grid (8 px base)

| Token | Value | Usage                                    |
| ----- | ----- | ---------------------------------------- |
| 8     | 8 px  | Tight gaps, icon padding                 |
| 16    | 16 px | Small gaps between items                 |
| 24    | 24 px | Card padding (small)                     |
| 32    | 32 px | Card padding (default), section sub-gaps |
| 48    | 48 px | Column gaps in grids                     |
| 64    | 64 px | Section padding (tablet)                 |
| 96    | 96 px | Section padding (desktop, `py-24`)       |

### Section padding

```
Desktop (lg+):  py-24 (96 px)
Tablet (sm):    py-16 (64 px)
Mobile:         py-12 (48 px)
```

---

## 2. Colour tokens

| Name           | Hex     | Tailwind       | Usage                                |
| -------------- | ------- | -------------- | ------------------------------------ |
| Primary        | #0B6B5D | `primary`      | Header, footer, buttons, headings    |
| Primary dark   | #07241F | `primary-dark` | Footer bg, hero boxes                |
| Primary hover  | #095549 | `primary-600`  | Hover on teal buttons                |
| Accent (amber) | #F2A32E | `accent`       | CTA buttons, highlights, hover links |
| Accent hover   | #D88A18 | `accent-600`   | Hover on amber buttons               |
| Success        | #00C47A | `success`      | Check marks, pass badges             |
| Warning        | #F59E0B | `warning`      | Caution badges                       |
| Danger         | #EF4444 | `danger`       | Error states                         |
| Body text      | #1F2937 | `body-text`    | All paragraph text                   |
| Muted          | #4B5563 | `muted`        | Secondary/supporting text            |
| Surface        | #F8FAF9 | `surface`      | Alternate section backgrounds        |
| Surface alt    | #F1F7F5 | `surface-alt`  | Info panels, callout boxes           |
| Border         | #E4EAE8 | `border`       | Card borders, dividers               |
| White          | #FFFFFF | `white`        | Cards, page bg                       |

**Section alternation:** White and surface backgrounds alternate. No near-black panels on content pages.

---

## 3. Typography

### Font families

- **Headings:** Plus Jakarta Sans (`var(--font-jakarta)`) - weight 700/800
- **Body:** Plus Jakarta Sans + Inter fallback (`var(--font-jakarta)`, `var(--font-inter)`)
- **Mono:** JetBrains Mono (certificate IDs, code)

### Type scale

| Element         | Size                          | Weight | Line height |
| --------------- | ----------------------------- | ------ | ----------- |
| H1              | `clamp(2.25rem, 4vw, 3.5rem)` | 700    | 1.15        |
| H2              | `clamp(1.75rem, 3vw, 2.5rem)` | 700    | 1.2         |
| H3              | 1.25 to 1.5 rem               | 600    | 1.3         |
| Body            | 17 to 18 px                   | 400    | 1.65        |
| Small / caption | 13 to 14 px                   | 400    | 1.5         |
| Eyebrow         | 11 to 12 px                   | 700    | -           |

- `text-balance` on all headings.
- Left-aligned text blocks. Centred only for short section headers and CTA bands.
- Paragraph max-width: 65 to 70 characters (`max-w-xl` or `max-w-2xl`).
- Muted text at AA contrast minimum (4.5:1 against white background).

---

## 4. Components

### Button

Three variants, 48 px tall, 12 px radius, focus ring.

```tsx
// Primary (amber) - main CTA
<Link className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-600
                 active:scale-[0.97] text-white font-bold text-sm px-7 py-3.5 rounded-xl
                 no-underline transition-all shadow-cta">

// Secondary (teal outline)
<Link className="inline-flex items-center justify-center gap-2 border-2 border-primary
                 text-primary hover:bg-primary hover:text-white font-semibold text-sm
                 px-7 py-3.5 rounded-xl no-underline transition-all">

// Ghost (teal text)
<Link className="inline-flex items-center justify-center gap-2 text-primary
                 hover:bg-surface font-medium text-sm px-7 py-3.5 rounded-xl
                 no-underline transition-all">
```

Utility classes: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.btn-ghost`, `.btn-white`

### Card

```tsx
<div className="bg-white rounded-2xl border border-border p-6 sm:p-8
                hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
```

Utility classes: `.card`, `.card-hover`

### PageHero

Full-width photo with a solid teal content box anchored left or right. Photo at full brightness. No gradient overlay.

Props: `image`, `imageAlt`, `title`, `description`, `breadcrumbs[]`, `cta`, `boxSide` (left/right), `objectPosition`

### SectionHeader (eyebrow + H2)

```tsx
<div className="section-header">
  <p className="section-eyebrow">Eyebrow label</p>
  <h2>Section heading</h2>
</div>
```

### FeatureBlock

Icon + heading + 1 to 2 lines. Used in grids of 2, 3, or 4 columns.

### CTABand

Full-width teal band with amber primary button and WhatsApp secondary. Used as the penultimate section on every public page.

Props: `heading`, `subheading`, `primaryLabel`, `primaryHref`, `whatsappUrl`, `variant`

### ContactBand

"Need more information?" band with "Send us a message" and "Call or WhatsApp us" cards. Used as the final section before the footer.

### Breadcrumb

Light variant (white on teal, for heroes) and dark variant (grey on white, for page content).

### SideNav

Desktop: sticky vertical navigation with active amber indicator. Mobile: collapsible accordion chip. Used on About, Admissions, Learning, and Courses sections.

### Dropdown (header)

White panel, 8 px radius, shadow, 12 px item padding, description line under each item, 150 ms fade-slide animation. Keyboard navigable (arrow keys, Escape).

### Badge

Utility class: `.badge`, `.badge-success`, `.badge-warning`, `.badge-danger`, `.badge-info`, `.badge-neutral`

---

## 5. Header structure

- **Utility bar:** 38 px, `bg-[#095549]`, hidden on mobile/tablet (lg+ only). Left: Student login, Visit musawo.ug, Support Musawo. Right: phone, WhatsApp, email.
- **Main bar:** 72 px, `bg-primary`, sticky. Logo left, dropdown nav centre, Log in text link + amber Enrol now button right.
- **Total fixed offset:** 72 px mobile/tablet, 110 px desktop (lg+).
- Public layout uses `pt-[72px] lg:pt-[110px]` to offset content.

---

## 6. Footer structure

Teal background (`bg-primary`), bottom bar slightly darker (`bg-[#0A5A4E]`).

12-column desktop grid:

- Brand block (4 cols): logo, tagline, description, social icons, Visit musawo.ug
- Quick Links (2 cols)
- Courses (2 cols)
- Enquiries (4 cols, 2 sub-columns): Local Enquiries + Admissions/Registry + Online Student Support

Section headings: 11 px, bold, uppercase, white, with 8 px amber underline accent.
Link colour: `rgba(255,255,255,0.9)`. Hover: accent amber.

Bottom bar: centred copyright line (16 px) + centred legal links row.
`pb-[88px]` on mobile to clear the 52 px WhatsApp FAB.

---

## 7. Animations

All animations respect `prefers-reduced-motion`. Uses `framer-motion` with `LazyMotion` + `domAnimation`.

| Effect          | Implementation                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------- |
| Section fade-up | `AnimateIn` component, `initial y:24 opacity:0`, `whileInView y:0 opacity:1`, `duration:0.5`       |
| Staggered cards | `StaggerGrid` component, 150 ms stagger                                                            |
| Card hover lift | `hover:-translate-y-0.5 transition-all duration-200`                                               |
| Dropdown panel  | `framer-motion AnimatePresence`, `y:-6 opacity:0` to `y:0 opacity:1`, `duration:0.15`              |
| Hero box        | `heroBoxIn` keyframe, `translateX(-28px) opacity:0` to `translateX(0) opacity:1`, `duration:0.35s` |
| Hero photo zoom | `heroZoom` keyframe, `scale:1` to `scale:1.05`, `duration:12s`                                     |

---

## 8. Responsiveness

Breakpoints tested: 320, 390, 640, 768, 1024, 1280, 1536, 1920 px.

Rules:

- No horizontal scroll at any width.
- Minimum font size: 16 px (`text-base`).
- Minimum tap target: 44 px.
- Stacked columns with consistent gaps (`gap-6` or `gap-8`).
- Tables turn into stacked cards at `sm` breakpoint where possible.
- Images use `next/image` with `fill` + `sizes` for fixed-aspect containers.
- Side nav collapses to accordion chip strip on mobile.

---

## 9. Portal consistency

All staff and student portals (student dashboard, tutor, admin, bursar, director, system) use:

- `PageHeader` and `SectionCard` from `src/components/layout/`
- `.card` and `.card-hover` for content blocks
- `.table-container` and `.table` for data tables
- `.badge-*` for status indicators
- `.nav-link` and `.nav-link-active` for sidebar navigation

---

## 10. No em dashes or en dashes

Never use `--`, `---`, `&mdash;`, `&ndash;`, `\u2013`, or `\u2014` in any user-visible text, component text, or page content. Use a hyphen (`-`), comma, or full stop instead.

---

## 11. Favicon and brand assets

All icons generated from the logo badge (`/assets/logo-header.png`) by `scripts/generate-brand-assets.mjs`:

| File                             | Size              | Purpose         |
| -------------------------------- | ----------------- | --------------- |
| `src/app/favicon.ico`            | 16/32/48 px multi | Browser tab     |
| `src/app/icon.png`               | 512 px            | Next.js icon    |
| `src/app/apple-icon.png`         | 180 px            | iOS home screen |
| `public/icons/icon-192.png`      | 192 px            | PWA             |
| `public/icons/icon-512.png`      | 512 px            | PWA             |
| `public/icons/icon-maskable.png` | 512 px            | PWA maskable    |

Declared once in root layout `metadata.icons`. No nested layout overrides them.

---

## 12. Pages checked (QA)

| Page                        | Widths                                     | Status |
| --------------------------- | ------------------------------------------ | ------ |
| / (Homepage)                | 320, 390, 640, 768, 1024, 1280, 1536, 1920 | Pass   |
| /courses                    | All                                        | Pass   |
| /courses/[slug]             | All                                        | Pass   |
| /admissions/how-to-enrol    | All                                        | Pass   |
| /admissions/fees            | All                                        | Pass   |
| /admissions/payment-options | All                                        | Pass   |
| /scholarships               | All                                        | Pass   |
| /learning/how-you-learn     | All                                        | Pass   |
| /learning/live-classes      | All                                        | Pass   |
| /learning/exams             | All                                        | Pass   |
| /resources                  | All                                        | Pass   |
| /about                      | All                                        | Pass   |
| /about/accreditation        | All                                        | Pass   |
| /about/trainers             | All                                        | Pass   |
| /faq                        | All                                        | Pass   |
| /contact                    | All                                        | Pass   |
| /privacy                    | All                                        | Pass   |
| /terms                      | All                                        | Pass   |
| /refund                     | All                                        | Pass   |
| /login                      | All                                        | Pass   |
| /register                   | All                                        | Pass   |
| /dashboard                  | All                                        | Pass   |
| /tutor                      | All                                        | Pass   |
| /bursar                     | All                                        | Pass   |
| /director                   | All                                        | Pass   |
| 404                         | All                                        | Pass   |

# Authenticated portal design system

The authenticated portals share a responsive shell. Public pages do not use the portal shell styles.

## Components

- `AppShell` arranges the sidebar, topbar, page content, and mobile drawer.
- `Sidebar` groups links and filters them through the central permission map. Route handlers and page guards remain the access control boundary.
- `Topbar` shows the current page label and account settings menu.
- `PageHeader` is the standard page title, subtitle, breadcrumb, and action row.
- `DashboardPageHeader` and `TabBar` provide greeting, URL-backed dashboard tabs, and widget editing.
- `WidgetGrid` splits cards into independent columns. `Widget` provides panel anatomy and isolates loading and rendering errors.
- `ListRow`, `MiniCard`, `ProfileCard`, and `ViewMoreLink` are shared widget content patterns.
- `WidgetCustomizer` saves visibility and ordering for each dashboard tab. Preferences are scoped to the authenticated user and can only refer to widgets granted by that user's permissions.

## Tokens

Portal colors are declared once as `--portal-*` CSS variables in `src/app/globals.css`. Tailwind's `portal-*` colors refer to those variables. The page uses a 240px desktop sidebar, 72px tablet or collapsed rail, and a 280px mobile drawer. The widget columns stack below 768px and use container queries for the two-up mini-card layout.

## Accessibility and motion

The mobile drawer supports Escape, scrim dismissal, body scroll locking, focus entry, and focus trapping. Sidebar links expose the current page. Buttons have accessible names, and reduced-motion preferences disable portal transitions and widget loading animation.

## Preferences API

`GET /api/dashboard/widgets?tab=general` returns only widgets whose required permission the authenticated user has. `PUT /api/dashboard/widgets` persists show or hide, order, and column preferences. Unknown tabs, widgets outside the user's permission set, invalid columns, duplicate IDs, and malformed preference sets are rejected.

## Widget body registry

`src/components/dashboard/widget-bodies.tsx` exports a `WIDGET_COMPONENTS` map that links each registry `component` string (for example `"task-list"`, `"class-list"`, `"course-cards"`) to an async server component. Each component fetches its own data from the database and returns widget body content using the shared `ListRow`, `MiniCard`, `ProfileCard`, and `ViewMoreLink` primitives. Body components are role-aware where needed (for example `TaskListBody` shows exam submissions for instructors and upcoming exams or assignments for students).

## DashboardTabBody server renderer

`src/components/dashboard/DashboardTabBody.tsx` is a server component that replaces the old generic link-card fallback. For a given user, role, and tab it:

1. Filters `DASHBOARD_WIDGETS` by tab, role restriction, and RBAC permission.
2. Loads saved `DashboardWidgetPreference` rows from the database.
3. Merges defaults with saved visibility, column, and position.
4. Renders each visible widget by calling its body component and wrapping the result in a shared `Widget`.
5. Balances the widgets into two masonry columns (one column below 768 px).

Every role's root `page.tsx` reads `searchParams.tab` and renders `DashboardTabBody` for non-general tabs. The general tab renders role-specific rich content (instructor and student dashboards) or the existing overview page (other roles). No tab is empty.

## Drag reordering

`WidgetCustomizer` uses `@dnd-kit/core` and `@dnd-kit/sortable` for drag-to-reorder with a `PointerSensor` (6 px activation distance). Each row is a `SortableWidgetRow` with a grip handle. Up and down arrow buttons, a column-move button, and a show or hide switch remain available alongside drag. Drag and arrow operations both persist immediately via the preferences API.

## Responsive review sizes

Use 1440px for the full sidebar, 1024px and 820px for the tablet rail, and 390px for the mobile drawer and single-column widget layout. Playwright scenarios live in `e2e/portal-shell.spec.ts`.
