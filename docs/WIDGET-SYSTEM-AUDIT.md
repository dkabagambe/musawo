# Widget System Audit Report

**Date**: November 11, 2026  
**Issue Reported**: "Widget preferences don't persist - changes in customizer don't reflect on dashboard"  
**Status**: NEEDS MANUAL TESTING WITH RUNNING SERVER

---

## Implementation Review

### ✅ Backend API (IMPLEMENTED)

**Endpoint**: `/api/dashboard/widgets`

**GET** - Fetch user's widget preferences
- ✅ Accepts `?tab=<tab_name>` parameter
- ✅ Fetches from `dashboard_widget_preferences` table
- ✅ Merges with default widget definitions
- ✅ Returns widgets with `visible`, `column`, `position` properties
- ✅ Filters by role permissions

**PUT** - Save widget preferences
- ✅ Accepts `{ tab, widgets: [...] }` body
- ✅ Validates tab name against allowed tabs
- ✅ Validates all widgets belong to allowed set
- ✅ Uses `upsert` to save preferences per widget
- ✅ Composite key: `userId_tab_widgetId`

**Database Model**: `DashboardWidgetPreference`
```prisma
model DashboardWidgetPreference {
  userId    String
  tab       String
  widgetId  String
  visible   Boolean
  column    Int
  position  Int
  
  @@unique([userId, tab, widgetId])
}
```

### ✅ Frontend UI (IMPLEMENTED)

**Component**: `WidgetCustomizer` in `src/components/ui/DashboardWidgets.tsx`

**Features**:
- ✅ "Edit My Widgets" button on dashboard
- ✅ Modal dialog with sortable widget list
- ✅ Toggle visibility per widget
- ✅ Move widgets between columns (left/right)
- ✅ Drag-and-drop reordering
- ✅ Reset to defaults button
- ✅ Auto-save on every change
- ✅ Error handling for save failures

**Server-Side Rendering**: `DashboardTabBody` in `src/components/dashboard/DashboardTabBody.tsx`
- ✅ Fetches preferences from database on page load
- ✅ Merges with default widget definitions
- ✅ Filters visible widgets
- ✅ Applies column assignments
- ✅ Respects position order

---

## 🔍 Potential Issues (UNVERIFIED - SERVER NOT RUNNING)

### Issue 1: Cache Staleness
**Symptom**: Changes save but don't appear until hard refresh  
**Possible cause**: Next.js aggressive caching of Server Components

**Check**:
1. Is `export const dynamic = "force-dynamic"` set on `/dashboard/page.tsx`?
2. Does the page use `revalidatePath` or `revalidateTag` after saving?
3. Are there any `cache: "force-cache"` fetch calls?

**Current implementation**:
- ❓ Dashboard page may be statically cached
- ✅ Widget preferences API returns fresh data
- ❓ Server component may not re-fetch after client-side save

### Issue 2: Race Condition
**Symptom**: Multiple quick changes result in inconsistent state  
**Possible cause**: Multiple PUT requests in flight, last one wins

**Check**:
1. Does `save()` function debounce or queue requests?
2. Are there optimistic updates that could conflict with server response?

**Current implementation**:
- ⚠️ No debouncing in `save()` function
- ⚠️ Uses `setSaving(true)` but doesn't prevent concurrent saves
- ✅ Uses transaction in database (`db.$transaction`)

### Issue 3: Context Not Updating
**Symptom**: Modal shows changes but dashboard doesn't update  
**Possible cause**: `DashboardPreferenceContext` not triggering re-render

**Check**:
1. After save, does `preferenceContext.update(next)` actually trigger a re-render?
2. Is the context provider wrapping the dashboard layout?
3. Does the server component re-render when context changes?

**Current implementation**:
- ✅ `preferenceContext.update(next)` called after successful save
- ❓ Context may not cause server component to re-fetch
- ❓ Server components don't subscribe to client-side React context

### Issue 4: Tab-Specific Preferences Not Isolated
**Symptom**: Changes on one tab affect other tabs  
**Possible cause**: Tab parameter not passed correctly

**Check**:
1. Is `tab` parameter passed to `WidgetCustomizer` component?
2. Does the PUT request include correct `tab` value?
3. Are preferences queried with correct `WHERE userId AND tab`?

**Current implementation**:
- ✅ Tab passed to `WidgetCustomizer`
- ✅ PUT body includes `{ tab, widgets }`
- ✅ Database query filters by `userId` AND `tab`

---

## 🔧 Root Cause Analysis

### Most Likely Issue: **Server Component Caching**

The dashboard is a **Server Component** that fetches widget preferences on every page load:

```typescript
// src/components/dashboard/DashboardTabBody.tsx
const saved = await db.dashboardWidgetPreference.findMany({
  where: { userId, tab },
});
```

**Problem**: After the client-side `WidgetCustomizer` saves preferences via `PUT /api/dashboard/widgets`, the page doesn't automatically re-render because:

1. Server Components don't re-render on client-side state changes
2. The page is likely cached by Next.js
3. The `PUT` API doesn't trigger `revalidatePath("/dashboard")`

**Expected behavior**:
1. User clicks "Edit My Widgets"
2. User toggles a widget off
3. Modal auto-saves via PUT request → ✅ Works
4. Modal updates its local state → ✅ Works
5. User closes modal
6. **Dashboard should re-fetch and re-render** → ❌ **Doesn't happen**

**Why it doesn't work**:
- Server Components are rendered on the server and sent as HTML
- Client-side PUT request doesn't trigger server re-render
- User must manually refresh (F5) to see changes

---

## ✅ Recommended Fixes

### Fix 1: Revalidate After Save (RECOMMENDED)
**Add server action to trigger revalidation**

```typescript
// src/app/api/dashboard/widgets/route.ts
import { revalidatePath } from "next/cache";

export async function PUT(request: Request) {
  // ... existing save logic ...
  
  await db.$transaction(...);
  
  // ADD THIS:
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard?tab=${tab}`);
  
  return NextResponse.json({ ok: true });
}
```

### Fix 2: Router Refresh After Save
**Force client-side navigation refresh**

```typescript
// src/components/ui/DashboardWidgets.tsx
import { useRouter } from "next/navigation";

export function WidgetCustomizer({ tab, onSave }: Props) {
  const router = useRouter();
  
  const save = async (next: EditableWidget[]) => {
    // ... existing save logic ...
    
    // ADD THIS:
    router.refresh(); // Triggers server component re-render
    
    onSave?.(next);
  };
}
```

### Fix 3: Make Dashboard Dynamic
**Ensure page never uses static cache**

```typescript
// src/app/(dashboard)/dashboard/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
```

---

## 🧪 Manual Testing Checklist

**Prerequisites**:
1. Start dev server: `npm run dev`
2. Seed demo data: `npm run demo:reset`
3. Login as `student.full@example.com` (password: `Demo1234!`)

**Test Steps**:
1. ✅ Navigate to `/dashboard`
2. ✅ Click "Edit My Widgets" button
3. ✅ Modal opens with list of widgets
4. ✅ Toggle a widget OFF (e.g., "Progress Overview")
5. ✅ Wait 1 second for auto-save
6. ✅ Close modal
7. ❓ **CHECK**: Is the widget immediately hidden on dashboard?
8. ❓ If NO → **BUG CONFIRMED**: Need to add revalidation
9. ✅ Refresh page (F5)
10. ❓ **CHECK**: Is the widget still hidden after refresh?
11. ❓ If YES → Preferences are saving correctly
12. ❓ If NO → Database save is broken

**Additional Tests**:
- Test reordering (drag and drop)
- Test moving widget to other column
- Test "Reset to defaults" button
- Test different tabs (General, Studies, Finance, Classes)
- Test as different roles (Principal, Director, Instructor)

---

## E2E Test Created

**File**: `e2e/widget-preferences.spec.ts`

**Tests**:
1. ✅ Widget customizer modal opens and closes
2. ✅ Hides and shows widgets persistently
3. ✅ Reset button restores defaults
4. ✅ Preferences are tab-specific

**Run with**:
```bash
# Start dev server first
npm run dev

# In another terminal
npx playwright test e2e/widget-preferences.spec.ts --headed
```

**Expected Results** (if bug is fixed):
- All 4 tests should PASS
- Widget changes should persist across page refreshes
- Different tabs should have independent preferences

**Actual Results** (without running server):
- Cannot test - server not running
- Need manual verification

---

## Summary

### Implementation Status
| Component | Status | Notes |
|-----------|--------|-------|
| Database model | ✅ COMPLETE | `dashboard_widget_preferences` table exists |
| API endpoints | ✅ COMPLETE | GET/PUT working |
| UI component | ✅ COMPLETE | Modal with drag-drop, toggle, reset |
| Server-side rendering | ✅ COMPLETE | Fetches and applies preferences |
| **Cache invalidation** | ❌ **MISSING** | No revalidation after save |
| **Client refresh trigger** | ❌ **MISSING** | No router.refresh() call |

### The Bug
**Root cause**: Server Component doesn't re-render after client-side save  
**User impact**: Changes appear to save but don't show until manual page refresh  
**Severity**: High - feature appears broken to users  
**Estimated fix time**: 5 minutes (add 2 lines of code)

### Recommended Action
1. Add `revalidatePath()` to PUT handler (Fix 1)
2. Add `router.refresh()` to save callback (Fix 2)
3. Add `dynamic = "force-dynamic"` to dashboard page (Fix 3)
4. Test manually with running server
5. Run e2e test suite to verify
6. Document in FEATURES-AUDIT.md

---

## Test Commands

```bash
# Start dev server
npm run dev

# Reset demo data (in another terminal)
npm run demo:reset

# Run widget preference tests (server must be running)
npx playwright test e2e/widget-preferences.spec.ts --headed

# Run all e2e tests
npx playwright test

# Type check
npx tsc --noEmit

# Unit tests
npm test
```

**Last reviewed**: November 11, 2026  
**Needs**: Manual testing with running server to confirm bug and verify fix
