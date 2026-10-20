import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { DASHBOARD_WIDGETS, type DashboardTab } from "@/lib/dashboard/widgets";

const TABS = new Set<DashboardTab>([
  "general",
  "studies",
  "finance",
  "classes",
  "teaching",
  "students",
  "assessment",
  "support",
  "materials",
  "admissions",
  "academics",
  "approvals",
  "reports",
  "payments",
  "reconciliation",
  "staff",
  "settings",
  "audit",
  "system",
  "logs",
]);

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tabValue = new URL(request.url).searchParams.get("tab") ?? "general";
  if (!TABS.has(tabValue as DashboardTab))
    return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
  const tab = tabValue as DashboardTab;
  const allowed = DASHBOARD_WIDGETS.filter(
    (widget) =>
      widget.defaultTab === tab &&
      (!widget.roles || widget.roles.includes(session.user.role)) &&
      can(session.user.role, widget.requiredPermission),
  );
  const saved = await db.dashboardWidgetPreference.findMany({
    where: { userId: session.user.id, tab },
  });
  const preferences = saved.map((item) => [item.widgetId, item] as const);
  const savedById = new Map(preferences);
  return NextResponse.json({
    widgets: allowed.map((widget, position) => {
      const preference = savedById.get(widget.id);
      return {
        ...widget,
        visible: preference?.visible ?? widget.defaultVisible ?? true,
        column: preference?.column ?? widget.defaultColumn,
        columnPinned: Boolean(
          preference && preference.column !== widget.defaultColumn,
        ),
        position: preference?.position ?? position,
      };
    }),
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    tab?: string;
    widgets?: Array<{
      id?: string;
      visible?: boolean;
      column?: number;
      position?: number;
    }>;
  } | null;
  if (
    !body ||
    !TABS.has(body.tab as DashboardTab) ||
    !Array.isArray(body.widgets) ||
    body.widgets.length > 40
  ) {
    return NextResponse.json(
      { error: "Invalid widget preferences" },
      { status: 400 },
    );
  }
  const tab = body.tab as DashboardTab;
  const allowed = DASHBOARD_WIDGETS.filter(
    (widget) =>
      widget.defaultTab === tab &&
      (!widget.roles || widget.roles.includes(session.user.role)) &&
      can(session.user.role, widget.requiredPermission),
  );
  const allowedById = new Map(allowed.map((widget) => [widget.id, widget]));
  const normalized = body.widgets.map((item, index) => {
    const widget = item.id ? allowedById.get(item.id) : undefined;
    if (
      !widget ||
      typeof item.visible !== "boolean" ||
      !Number.isInteger(item.column) ||
      item.column! < 0 ||
      item.column! > 1
    )
      return null;
    const position = Number.isInteger(item.position)
      ? Math.max(0, Math.min(100, item.position!))
      : index;
    return {
      widgetId: widget.id,
      visible: item.visible,
      column: item.column!,
      position,
    };
  });
  if (
    normalized.some((item) => item === null) ||
    normalized.length !== allowed.length ||
    new Set(normalized.map((item) => item!.widgetId)).size !== normalized.length
  ) {
    return NextResponse.json(
      { error: "Widgets must match the permitted widgets for this tab" },
      { status: 403 },
    );
  }
  await db.$transaction(
    normalized.map((item) =>
      db.dashboardWidgetPreference.upsert({
        where: {
          userId_tab_widgetId: {
            userId: session.user.id,
            tab,
            widgetId: item!.widgetId,
          },
        },
        create: { userId: session.user.id, tab, ...item! },
        update: {
          visible: item!.visible,
          column: item!.column,
          position: item!.position,
        },
      }),
    ),
  );
  return NextResponse.json({ ok: true });
}
