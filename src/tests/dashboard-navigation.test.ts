import { describe, expect, it } from "vitest";
import { filterNavByPermission } from "@/lib/rbac/navigation";
import { DASHBOARD_WIDGETS } from "@/lib/dashboard/widgets";
import { balanceDashboardColumns, formatCount } from "@/lib/dashboard/format";
import type { NavItem } from "@/components/ui/AppShell";

const nav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: null },
  { href: "/dashboard/courses", label: "My Courses", icon: null },
  { href: "/dashboard/payments", label: "Payments", icon: null },
  { href: "/director/staff", label: "Staff Accounts", icon: null },
];

describe("permission filtered portal navigation", () => {
  it("keeps a student's permitted learning and own payment links", () => {
    expect(
      filterNavByPermission(nav, "STUDENT").map((item) => item.href),
    ).toEqual(["/dashboard", "/dashboard/courses", "/dashboard/payments"]);
  });

  it("does not show management links to a student", () => {
    expect(
      filterNavByPermission(nav, "STUDENT").some(
        (item) => item.href === "/director/staff",
      ),
    ).toBe(false);
  });

  it("registers each widget with a required permission", () => {
    expect(DASHBOARD_WIDGETS.length).toBeGreaterThan(0);
    expect(new Set(DASHBOARD_WIDGETS.map((widget) => widget.id)).size).toBe(
      DASHBOARD_WIDGETS.length,
    );
    expect(
      DASHBOARD_WIDGETS.every(
        (widget) => widget.requiredPermission && widget.defaultTab,
      ),
    ).toBe(true);
  });

  it("keeps the instructor glance widget optional by default", () => {
    expect(
      DASHBOARD_WIDGETS.find((widget) => widget.id === "at-a-glance"),
    ).toMatchObject({
      defaultTab: "general",
      defaultVisible: false,
    });
  });

  it("limits tutor-specific dashboard widgets to teaching roles", () => {
    expect(
      DASHBOARD_WIDGETS.find((widget) => widget.id === "at-a-glance")?.roles,
    ).toEqual(["INSTRUCTOR", "TEACHING_ASSISTANT"]);
    expect(
      DASHBOARD_WIDGETS.find((widget) => widget.id === "my-students")?.roles,
    ).toEqual(["INSTRUCTOR", "TEACHING_ASSISTANT"]);
  });

  it("balances unpinned widgets by shortest column and preserves pinned columns", () => {
    const widgets = [
      { id: "long", column: 1, columnPinned: false },
      { id: "short", column: 1, columnPinned: false },
      { id: "pinned", column: 0, columnPinned: true },
    ];
    const [left, right] = balanceDashboardColumns(widgets, (widget) =>
      widget.id === "long" ? 300 : 100,
    );

    expect(left.map((widget) => widget.id)).toEqual(["long", "pinned"]);
    expect(right.map((widget) => widget.id)).toEqual(["short"]);
  });

  it("formats singular and irregular dashboard counts", () => {
    expect(formatCount(1, "student")).toBe("1 student");
    expect(formatCount(8, "student")).toBe("8 students");
    expect(formatCount(1, "class")).toBe("1 class");
    expect(formatCount(2, "class")).toBe("2 classes");
  });
});
