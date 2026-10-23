import { Suspense } from "react";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import {
  DASHBOARD_WIDGETS,
  type DashboardTab,
  type DashboardWidgetDefinition,
} from "@/lib/dashboard/widgets";
import { Widget, WidgetSkeleton } from "@/components/ui/DashboardWidgets";
import { balanceDashboardColumns } from "@/lib/dashboard/format";
import {
  WIDGET_COMPONENTS,
  type WidgetBodyProps,
} from "@/components/dashboard/widget-bodies";
import type { UserRole } from "@prisma/client";

interface MergedWidget extends DashboardWidgetDefinition {
  visible: boolean;
  column: number;
  columnPinned: boolean;
  position: number;
}

// Async wrapper that renders one widget body, used inside Suspense
async function WidgetBodyAsync({
  widget,
  bodyProps,
}: {
  widget: MergedWidget;
  bodyProps: WidgetBodyProps;
}) {
  const Body = WIDGET_COMPONENTS[widget.component];
  const content = Body
    ? await Body(bodyProps)
    : <p className="dashboard-widget-empty">No content available.</p>;
  return (
    <Widget
      key={widget.id}
      title={widget.title}
      href={widget.fullPageHref}
    >
      {content}
    </Widget>
  );
}

function WidgetWithSuspense({
  widget,
  bodyProps,
}: {
  widget: MergedWidget;
  bodyProps: WidgetBodyProps;
}) {
  return (
    <Suspense fallback={<WidgetSkeleton rows={3} />}>
      {/* @ts-ignore async server component */}
      <WidgetBodyAsync widget={widget} bodyProps={bodyProps} />
    </Suspense>
  );
}

export async function DashboardTabBody({
  userId,
  role,
  tab,
}: {
  userId: string;
  role: UserRole;
  tab: DashboardTab;
}) {
  const allowed = DASHBOARD_WIDGETS.filter(
    (w) =>
      w.defaultTab === tab &&
      (!w.roles || w.roles.includes(role)) &&
      can(role, w.requiredPermission),
  );

  const saved = await db.dashboardWidgetPreference.findMany({
    where: { userId, tab },
  });
  const savedById = new Map(saved.map((s) => [s.widgetId, s]));

  const widgets: MergedWidget[] = allowed.map((w, position) => {
    const pref = savedById.get(w.id);
    return {
      ...w,
      visible: pref?.visible ?? w.defaultVisible ?? true,
      column: pref?.column ?? w.defaultColumn,
      columnPinned: Boolean(pref && pref.column !== w.defaultColumn),
      position: pref?.position ?? position,
    };
  });

  const visibleWidgets = widgets
    .filter((w) => w.visible)
    .sort((a, b) => a.position - b.position);

  if (!visibleWidgets.length) {
    return (
      <div className="dashboard-tab-empty">
        <p>Nothing on this tab yet.</p>
      </div>
    );
  }

  // Separate full-width (span 2) from half-width (span 1)
  const wideWidgets = visibleWidgets.filter((w) => (w.defaultSpan ?? 1) === 2);
  const halfWidgets = visibleWidgets.filter((w) => (w.defaultSpan ?? 1) !== 2);

  // Build placeholder entries for column balancing (no content needed — Suspense handles it)
  const halfEntries = halfWidgets.map((w) => ({
    widget: w,
    column: w.column,
    columnPinned: w.columnPinned,
  }));

  const [left, right] = balanceDashboardColumns(halfEntries, (entry) =>
    148 + Math.max(0, entry.widget.title.length - 24) * 0.5,
  );

  const bodyProps: WidgetBodyProps = { userId, role };

  const renderCol = (entries: typeof halfEntries) =>
    entries.map((entry) => (
      <WidgetWithSuspense
        key={entry.widget.id}
        widget={entry.widget}
        bodyProps={{ ...bodyProps, fullPageHref: entry.widget.fullPageHref }}
      />
    ));

  return (
    <div className="dashboard-widget-grid">
      {/* Full-width widgets span both columns */}
      {wideWidgets.map((w) => (
        <div key={w.id} className="dashboard-widget-full">
          <WidgetWithSuspense
            widget={w}
            bodyProps={{ ...bodyProps, fullPageHref: w.fullPageHref }}
          />
        </div>
      ))}
      {/* Half-width widgets in balanced two-column layout */}
      {halfWidgets.length > 0 && (
        <>
          <div className="dashboard-widget-column">{renderCol(left)}</div>
          <div className="dashboard-widget-column">{renderCol(right)}</div>
        </>
      )}
    </div>
  );
}
