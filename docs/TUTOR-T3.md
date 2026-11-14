# T3 Widgets - Root Cause and Fix

## Root cause

Two bugs combined to make ordering appear broken.

**Bug 1 (primary):** `WidgetCustomizer.save()` never called `router.refresh()` after a successful PUT. The widget grid is rendered by `DashboardTabBody`, an async server component. Without a refresh, Next.js kept serving the original server render from page load - the DB was updated correctly but the page never re-fetched it.

**Bug 2 (secondary):** `balanceDashboardColumns()` only respected a saved column preference when `columnPinned` was `true`, which was only set when the saved column *differed* from the default. Any widget that had been saved but not column-shifted would still be re-assigned by the height-balancing algorithm, overriding the user's intent.

## What was fixed

- `DashboardWidgets.tsx`: added `router.refresh()` after every successful PUT, so the server component re-renders with the new DB state.
- `DashboardWidgets.tsx`: added `TouchSensor` alongside `PointerSensor` for touch-screen drag support.
- `DashboardWidgets.tsx`: added "Move to top" and "Move to bottom" buttons (using `ChevronsUp`/`ChevronsDown`) for keyboard/screen-reader accessibility, alongside the existing move-up and move-down buttons.
- `DashboardWidgets.tsx`: "Layout saved" toast appears for 2.5 s after each successful save.
- `DashboardTabBody.tsx`: `columnPinned` is now `true` for any widget that has an explicit saved preference row (not just ones that differ from the default column), so `balanceDashboardColumns` always honours the user's saved column.
- `api/dashboard/widgets/route.ts`: same `columnPinned` logic fix applied to the GET handler that feeds the client customizer.
- `globals.css`: added `.dashboard-customizer-saved` style for the toast.
- `e2e/widget-preferences.spec.ts`: rewrote the test file with 10 tests that use real DOM selectors and cover move-up, move-to-top, hide/show, reset, tab isolation, drag handles, tutor tab, and mobile 390 px.
