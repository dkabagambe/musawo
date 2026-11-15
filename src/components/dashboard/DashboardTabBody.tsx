import { Suspense } from "react";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import {
  DASHBOARD_WIDGETS,
  type DashboardTab,
  type DashboardWidgetDefinition,
} from "@/lib/dashboard/widgets";
import { Widget, WidgetSkeleton, WidgetOrderSyncer } from "@/components/ui/DashboardWidgets";
import { balanceDashboardColumns } from "@/lib/dashboard/format";
import {
  WIDGET_COMPONENTS,
  type WidgetBodyProps,
} from "@/components/dashboard/widget-bodies";
import type { UserRole } from "@prisma/client";

export interface MergedWidget extends DashboardWidgetDefinition {
  visible: boolean;
  column: number;
  columnPinned: boolean;
  position: number;
}

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
    <Widget title={widget.title} href={widget.fullPageHref}>
      {content}
    </Widget>
  );
}

function WidgetWithSuspense({
  widget,
  bodyProps,
  order,
}: {
  widget: MergedWidget;
  bodyProps: WidgetBodyProps;
  order: number;
}) {
  return (
    <div
      data-widget-id={widget.id}
      data-widget-col={widget.column}
      // Initial server-side order within the column so the page looks right
      // before JavaScript loads. The WidgetOrderSyncer overrides this on the
      // client as soon as preferences are known.
      style={{ order }}
    >
      <Suspense fallback={<WidgetSkeleton rows={3} />}>
        {/* @ts-ignore async server component */}
        <WidgetBodyAsync widget={widget} bodyProps={bodyProps} />
      </Suspense>
    </div>
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
      columnPinned: pref != null,
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

  const wideWidgets = visibleWidgets.filter((w) => (w.defaultSpan ?? 1) === 2);
  const halfWidgets = visibleWidgets.filter((w) => (w.defaultSpan ?? 1) !== 2);

  const halfEntries = halfWidgets.map((w) => ({
    widget: w,
    column: w.column,
    columnPinned: w.columnPinned,
  }));

  const [left, right] = balanceDashboardColumns(halfEntries, (entry) =>
    148 + Math.max(0, entry.widget.title.length - 24) * 0.5,
  );

  const bodyProps: WidgetBodyProps = { userId, role };

  // Metadata passed to the client syncer — serializable, no React nodes.
  const widgetMeta = halfWidgets.map((w) => ({
    id: w.id,
    position: w.position,
    column: w.column,
    visible: w.visible,
  }));

  // Build a column → widget-ids map so the syncer knows which column each
  // widget was assigned to server-side (for the initial order attribute).
  const leftIds = left.map((e) => e.widget.id);
  const rightIds = right.map((e) => e.widget.id);

  const colOf = (id: string) => (leftIds.includes(id) ? 0 : 1);
  const orderIn = (id: string, col: number) => {
    const list = col === 0 ? leftIds : rightIds;
    return list.indexOf(id);
  };

  return (
    <div className="dashboard-widget-grid">
      {wideWidgets.map((w) => (
        <div key={w.id} className="dashboard-widget-full">
          <WidgetWithSuspense
            widget={w}
            bodyProps={{ ...bodyProps, fullPageHref: w.fullPageHref }}
            order={0}
          />
        </div>
      ))}

      {halfWidgets.length > 0 && (
        <>
          {/* WidgetOrderSyncer watches the preference context and applies
              `style.order` / `style.display` to each [data-widget-id] node
              immediately when preferences change — no server round-trip needed. */}
          <WidgetOrderSyncer widgetMeta={widgetMeta} />

          <div className="dashboard-widget-column">
            {left.map((entry) => (
              <WidgetWithSuspense
                key={entry.widget.id}
                widget={entry.widget}
                bodyProps={{ ...bodyProps, fullPageHref: entry.widget.fullPageHref }}
                order={orderIn(entry.widget.id, 0)}
              />
            ))}
          </div>
          <div className="dashboard-widget-column">
            {right.map((entry) => (
              <WidgetWithSuspense
                key={entry.widget.id}
                widget={entry.widget}
                bodyProps={{ ...bodyProps, fullPageHref: entry.widget.fullPageHref }}
                order={orderIn(entry.widget.id, 1)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
