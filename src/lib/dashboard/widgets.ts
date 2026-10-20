import type { Permission } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";

export type DashboardTab =
  | "general"
  | "studies"
  | "finance"
  | "classes"
  | "teaching"
  | "students"
  | "assessment"
  | "support"
  | "materials"
  | "admissions"
  | "academics"
  | "approvals"
  | "reports"
  | "payments"
  | "reconciliation"
  | "staff"
  | "settings"
  | "audit"
  | "system"
  | "logs";

export interface DashboardWidgetDefinition {
  id: string;
  title: string;
  requiredPermission: Permission;
  defaultTab: DashboardTab;
  defaultColumn: 0 | 1;
  component: string;
  fullPageHref?: string;
  defaultVisible?: boolean;
  roles?: UserRole[];
}

export const DASHBOARD_WIDGETS: DashboardWidgetDefinition[] = [
  {
    id: "todos",
    title: "To Dos",
    requiredPermission: "exams.mark",
    defaultTab: "general",
    defaultColumn: 0,
    component: "task-list",
    fullPageHref: "/tutor/exams",
  },
  {
    id: "student-todos",
    title: "To Dos",
    requiredPermission: "courses.view",
    defaultTab: "general",
    defaultColumn: 0,
    component: "task-list",
    fullPageHref: "/dashboard/gradebook",
    roles: ["STUDENT"],
  },
  {
    id: "at-a-glance",
    title: "At a glance",
    requiredPermission: "courses.view",
    defaultTab: "general",
    defaultColumn: 1,
    component: "metrics",
    defaultVisible: false,
    roles: ["INSTRUCTOR", "TEACHING_ASSISTANT"],
  },
  {
    id: "holds",
    title: "Holds",
    requiredPermission: "payments.initiate",
    defaultTab: "general",
    defaultColumn: 1,
    component: "status-list",
    fullPageHref: "/dashboard/payments",
  },
  {
    id: "upcoming-classes",
    title: "Upcoming Classes",
    requiredPermission: "classes.join",
    defaultTab: "general",
    defaultColumn: 0,
    component: "class-list",
    fullPageHref: "/dashboard/timetable",
  },
  {
    id: "my-courses",
    title: "My Courses",
    requiredPermission: "courses.view",
    defaultTab: "general",
    defaultColumn: 1,
    component: "course-cards",
    fullPageHref: "/dashboard/courses",
  },
  {
    id: "inbox",
    title: "Inbox",
    requiredPermission: "enrolments.view",
    defaultTab: "general",
    defaultColumn: 0,
    component: "inbox-list",
  },
  {
    id: "course-progress",
    title: "Course Progress",
    requiredPermission: "courses.view",
    defaultTab: "studies",
    defaultColumn: 0,
    component: "progress",
    fullPageHref: "/dashboard/courses",
  },
  {
    id: "exams",
    title: "Exams",
    requiredPermission: "grades.view",
    defaultTab: "studies",
    defaultColumn: 1,
    component: "exam-list",
    fullPageHref: "/dashboard/gradebook",
  },
  {
    id: "results",
    title: "Results",
    requiredPermission: "grades.view",
    defaultTab: "studies",
    defaultColumn: 0,
    component: "results",
    fullPageHref: "/dashboard/results",
  },
  {
    id: "log-book",
    title: "Log book",
    requiredPermission: "attendance.view",
    defaultTab: "studies",
    defaultColumn: 1,
    component: "log-book",
  },
  {
    id: "simulations",
    title: "Simulations",
    requiredPermission: "courses.view",
    defaultTab: "studies",
    defaultColumn: 0,
    component: "simulations",
  },
  {
    id: "fees-summary",
    title: "Fees Summary",
    requiredPermission: "payments.view",
    defaultTab: "finance",
    defaultColumn: 0,
    component: "fee-summary",
    fullPageHref: "/dashboard/payments",
  },
  {
    id: "payment-history",
    title: "Payment History",
    requiredPermission: "payments.initiate",
    defaultTab: "finance",
    defaultColumn: 1,
    component: "payment-history",
    fullPageHref: "/dashboard/payments",
  },
  {
    id: "receipts",
    title: "Receipts",
    requiredPermission: "payments.initiate",
    defaultTab: "finance",
    defaultColumn: 0,
    component: "receipts",
    fullPageHref: "/dashboard/payments",
  },
  {
    id: "pay-now",
    title: "Pay now",
    requiredPermission: "payments.initiate",
    defaultTab: "finance",
    defaultColumn: 1,
    component: "payment-action",
    fullPageHref: "/dashboard/payments",
  },
  {
    id: "timetable",
    title: "Timetable",
    requiredPermission: "classes.view",
    defaultTab: "classes",
    defaultColumn: 0,
    component: "timetable",
    fullPageHref: "/dashboard/timetable",
  },
  {
    id: "recordings",
    title: "Recordings",
    requiredPermission: "classes.join",
    defaultTab: "classes",
    defaultColumn: 1,
    component: "recordings",
    fullPageHref: "/dashboard/recordings",
  },
  {
    id: "attendance",
    title: "Attendance",
    requiredPermission: "attendance.view",
    defaultTab: "classes",
    defaultColumn: 0,
    component: "attendance",
  },
  {
    id: "today-classes",
    title: "Today's Classes",
    requiredPermission: "classes.manage",
    defaultTab: "teaching",
    defaultColumn: 0,
    component: "teacher-classes",
    fullPageHref: "/tutor/classes",
  },
  {
    id: "my-students",
    title: "My Students",
    requiredPermission: "students.view",
    defaultTab: "general",
    defaultColumn: 1,
    component: "student-cards",
    fullPageHref: "/tutor/students",
    roles: ["INSTRUCTOR", "TEACHING_ASSISTANT"],
  },
  {
    id: "marking-queue",
    title: "Exams and marking queue",
    requiredPermission: "exams.mark",
    defaultTab: "assessment",
    defaultColumn: 0,
    component: "marking-queue",
    fullPageHref: "/tutor/exams",
  },
  {
    id: "applications",
    title: "Applications",
    requiredPermission: "applications.view",
    defaultTab: "admissions",
    defaultColumn: 0,
    component: "application-list",
    fullPageHref: "/registrar/applications",
  },
  {
    id: "pending-students",
    title: "Students pending acceptance",
    requiredPermission: "students.view",
    defaultTab: "students",
    defaultColumn: 0,
    component: "pending-students",
    fullPageHref: "/registrar/students",
  },
  {
    id: "graduands",
    title: "Graduands",
    requiredPermission: "graduands.prepare",
    defaultTab: "academics",
    defaultColumn: 1,
    component: "graduand-list",
    fullPageHref: "/registrar/graduands",
  },
  {
    id: "approvals",
    title: "Approvals",
    requiredPermission: "approvals.decide",
    defaultTab: "approvals",
    defaultColumn: 0,
    component: "approval-list",
    fullPageHref: "/director/approvals",
  },
  {
    id: "financial-reports",
    title: "Financial Reports",
    requiredPermission: "reports.financial",
    defaultTab: "reports",
    defaultColumn: 0,
    component: "financial-reports",
  },
  {
    id: "staff-directory",
    title: "Staff",
    requiredPermission: "staff.view",
    defaultTab: "staff",
    defaultColumn: 0,
    component: "staff-list",
  },
  {
    id: "system-status",
    title: "System Status",
    requiredPermission: "integrations.edit",
    defaultTab: "system",
    defaultColumn: 0,
    component: "system-status",
  },
  {
    id: "audit-log",
    title: "Audit Log",
    requiredPermission: "audit.view",
    defaultTab: "audit",
    defaultColumn: 0,
    component: "audit-list",
  },

  // ── Instructor secondary-tab widgets (no empty tabs) ──
  {
    id: "my-students-detail",
    title: "My Students",
    requiredPermission: "students.view",
    defaultTab: "students",
    defaultColumn: 0,
    component: "student-cards",
    fullPageHref: "/tutor/students",
    roles: ["INSTRUCTOR", "TEACHING_ASSISTANT"],
  },
  {
    id: "tutor-announcements",
    title: "Announcements",
    requiredPermission: "announcements.send.own",
    defaultTab: "support",
    defaultColumn: 0,
    component: "inbox-list",
    fullPageHref: "/tutor/announcements",
    roles: ["INSTRUCTOR", "TEACHING_ASSISTANT"],
  },

  // ── Finance / bursar secondary-tab widgets ──
  {
    id: "finance-approvals",
    title: "Pending Approvals",
    requiredPermission: "payments.view",
    defaultTab: "payments",
    defaultColumn: 0,
    component: "approval-list",
    fullPageHref: "/finance/approvals",
  },
  {
    id: "reconciliation-summary",
    title: "Reconciliation",
    requiredPermission: "ledger.view",
    defaultTab: "reconciliation",
    defaultColumn: 0,
    component: "financial-reports",
    fullPageHref: "/finance/ledger",
  },

  // ── Admin / system secondary-tab widgets ──
  {
    id: "admin-settings",
    title: "Settings",
    requiredPermission: "settings.view",
    defaultTab: "settings",
    defaultColumn: 0,
    component: "system-status",
    fullPageHref: "/admin/settings",
  },
  {
    id: "system-logs",
    title: "System Logs",
    requiredPermission: "audit.view",
    defaultTab: "logs",
    defaultColumn: 0,
    component: "audit-list",
    fullPageHref: "/system/audit",
  },

  // ── Deputy / HR support-tab widget ──
  {
    id: "support-tickets",
    title: "Support Tickets",
    requiredPermission: "support.view",
    defaultTab: "support",
    defaultColumn: 0,
    component: "support-list",
    fullPageHref: "/deputy/complaints",
  },

  // ── Reports-tab widgets for non-finance roles ──
  {
    id: "academic-reports",
    title: "Academic Reports",
    requiredPermission: "reports.academic",
    defaultTab: "reports",
    defaultColumn: 0,
    component: "financial-reports",
    fullPageHref: "/principal/reports",
  },
  {
    id: "board-reports-widget",
    title: "Reports",
    requiredPermission: "reports.board",
    defaultTab: "reports",
    defaultColumn: 0,
    component: "financial-reports",
    fullPageHref: "/board/reports",
  },
  {
    id: "general-reports",
    title: "Reports",
    requiredPermission: "reports.view",
    defaultTab: "reports",
    defaultColumn: 0,
    component: "financial-reports",
    fullPageHref: "/auditor/reports",
  },

  // ── Audit-tab widget for board (policies tab) ──
  {
    id: "board-audit-log",
    title: "Audit Log",
    requiredPermission: "audit.view",
    defaultTab: "audit",
    defaultColumn: 0,
    component: "audit-list",
    fullPageHref: "/board/policies",
  },
];
