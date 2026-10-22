import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import {
  DASHBOARD_WIDGETS,
  type DashboardTab,
  type DashboardWidgetDefinition,
} from "@/lib/dashboard/widgets";
import { Widget } from "@/components/ui/DashboardWidgets";
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

interface RenderedEntry {
  widget: MergedWidget;
  content: React.ReactNode;
  column: number;
  columnPinned: boolean;
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

  const renderWidget = async (w: MergedWidget) => {
    const Body = WIDGET_COMPONENTS[w.component];
    const bodyProps: WidgetBodyProps = { userId, role, fullPageHref: w.fullPageHref };
    const content = Body
      ? await Body(bodyProps)
      : <p className="dashboard-widget-empty">No content available.</p>;
    return { widget: w, content, column: w.column, columnPinned: w.columnPinned };
  };

  const [wideRendered, halfRendered] = await Promise.all([
    Promise.all(wideWidgets.map(renderWidget)),
    Promise.all(halfWidgets.map(renderWidget)),
  ]);

  const [left, right] = balanceDashboardColumns(halfRendered, (entry) =>
    148 + Math.max(0, entry.widget.title.length - 24) * 0.5,
  );

  const makeWidget = (entry: RenderedEntry) => (
    <Widget
      key={entry.widget.id}
      title={entry.widget.title}
      href={entry.widget.fullPageHref}
    >
      {entry.content}
    </Widget>
  );

  return (
    <div className="dashboard-widget-grid">
      {/* Full-width widgets span both columns */}
      {wideRendered.map((entry) => (
        <div key={entry.widget.id} className="dashboard-widget-full">
          {makeWidget(entry)}
        </div>
      ))}
      {/* Half-width widgets in balanced two-column layout */}
      {halfRendered.length > 0 && (
        <>
          <div className="dashboard-widget-column">{left.map(makeWidget)}</div>
          <div className="dashboard-widget-column">{right.map(makeWidget)}</div>
        </>
      )}
    </div>
  );
}
